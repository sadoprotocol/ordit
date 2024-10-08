#!/bin/bash
# Script Name: run_indexer.sh
# Description: This script launches the command "INDEXER_COMMIT_BLOCKS=<value> npm run indexer".
# It automatically detects the total RAM of the machine and sets the Node.js memory option (--max-old-space-size)
# to 90% of that capacity. If the command runs for more than 2 minutes with COMMIT_BLOCKS < 5000, the script
# will terminate and restart it with MAX_COMMIT_BLOCKS and resume decreasing if it fails.
# Parameters:
#   1. MAX_COMMIT_BLOCKS (optional): The initial value for INDEXER_COMMIT_BLOCKS. Default is 5000.
#   2. MIN_COMMIT_BLOCKS (optional): The minimum value for INDEXER_COMMIT_BLOCKS before giving up. Default is 10.

# Function to detect total system RAM in MB and set Node.js memory limit to 90% of it
set_memory_limit() {
    total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    total_ram_mb=$((total_ram_kb / 1024))
    max_memory_mb=$((total_ram_mb * 90 / 100)) # 90% of total RAM in MB
    echo "Detected total RAM: ${total_ram_mb} MB. Setting Node.js memory limit to ${max_memory_mb} MB."
    export NODE_OPTIONS="--max-old-space-size=${max_memory_mb}"
}

MAX_COMMIT_BLOCKS=${1:-5000}
MIN_COMMIT_BLOCKS=${2:-10}

COMMIT_BLOCKS=$MAX_COMMIT_BLOCKS

# Calculate the decrement value based on the number of digits in MAX_COMMIT_BLOCKS
DECREASE_INTERVAL=$((10 ** (${#MAX_COMMIT_BLOCKS} - 1)))

# Create a temporary file to capture command output
LOG_FILE=$(mktemp)

set_memory_limit

run_command() {
    # Clear the log file before running the command
    >"$LOG_FILE"

    # Run the command in the background and get its PID
    INDEXER_COMMIT_BLOCKS=$COMMIT_BLOCKS npm run indexer 2>&1 | tee "$LOG_FILE" &
    command_pid=$!

    # Monitor the command for 10 minutes
    runtime=0
    while [ $runtime -lt 600 ]; do
        # Check if the command is still running
        if ! ps -p $command_pid >/dev/null; then
            break
        fi

        # Check the log file for the "JavaScript heap out of memory" error in real-time
        if grep -q "JavaScript heap out of memory" "$LOG_FILE"; then
            echo "Detected 'JavaScript heap out of memory' error. Terminating the command..."
            kill -9 $command_pid
            wait $command_pid 2>/dev/null
            return 1
        fi

        sleep 1
        runtime=$((runtime + 1))
    done

    # If the command is still running after 10 minutes and COMMIT_BLOCKS < 5000, terminate and restart to set higher MAX_COMMIT_BLOCKS
    if ps -p $command_pid >/dev/null && [ $COMMIT_BLOCKS -lt 5000 ]; then
        echo "Command is still running after 2 minutes with COMMIT_BLOCKS=$COMMIT_BLOCKS. Restarting with MAX_COMMIT_BLOCKS=$MAX_COMMIT_BLOCKS."
        kill -9 $command_pid
        wait $command_pid 2>/dev/null
        COMMIT_BLOCKS=$MAX_COMMIT_BLOCKS
        return 2 # Indicate restart with max value
    fi

    # Wait for the command to finish and capture its exit status
    wait $command_pid
    command_exit_status=$?
    if [ $command_exit_status -ne 0 ]; then
        return 1
    else
        return 0
    fi
}

# Loop until the command succeeds or the value of COMMIT_BLOCKS is too low
while [ $COMMIT_BLOCKS -ge $MIN_COMMIT_BLOCKS ]; do
    echo "Running with INDEXER_COMMIT_BLOCKS=$COMMIT_BLOCKS"

    run_command
    case $? in
    0)
        echo "Command succeeded with INDEXER_COMMIT_BLOCKS=$COMMIT_BLOCKS"
        rm "$LOG_FILE" # Remove the temporary log file
        exit 0
        ;;
    1)
        echo "Command failed or ran out of memory with INDEXER_COMMIT_BLOCKS=$COMMIT_BLOCKS"
        if ((COMMIT_BLOCKS - DECREASE_INTERVAL < MIN_COMMIT_BLOCKS)); then
            COMMIT_BLOCKS=$MIN_COMMIT_BLOCKS
        else
            COMMIT_BLOCKS=$((COMMIT_BLOCKS - DECREASE_INTERVAL))
        fi
        ;;
    2)
        echo "Restarting command with MAX_COMMIT_BLOCKS=$MAX_COMMIT_BLOCKS due to prolonged runtime."
        COMMIT_BLOCKS=$MAX_COMMIT_BLOCKS
        ;;
    esac
done

echo "Command failed with all values. Minimum threshold reached."
rm "$LOG_FILE" # Remove the temporary log file
exit 1
