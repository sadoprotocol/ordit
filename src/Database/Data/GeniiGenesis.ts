import { config } from "~Config.ts";

const geniiGenesisIds = [
  "b9d87b60a6613103880102bad26d7cc61e7e981f81cc1e2a0eaf8d060914b384i0",
  "1dc48a699d2e9cd76998f4dfc63547811fe2f31fb0ddd41a126878b7042a9105i0",
  "eb321398178184cb8f9e99b48fdedf4498adbe39f0b4238aaf06a5c50ce47bb6i0",
  "263e27ed1cefc1f288100684150e7071fae98d31c1c58f870a0f32fb46a8f27di0",
  "3504ad047129e16b7b73134a963be49631701f1057d05b4a67eed7b96b4d9ba5i0",
  "b3962fc1c17b67377a9df4fd9c06d7c46693bf2641005b84c6464440503a2c70i0",
  "94fed3fb2bb035dc6cdc90be484611b6b9bcb137f8d4ef9ec7b0c6c7f83f9ee9i0",
  "3d3608c18f7b84415032eed2aca97923b04bc2a5c7803411f6dda9044bcd4d6bi0",
  "d8eccf7644a65077f75d8d086227b3834b2e1938c7f240d702f3f92f7d9c0b3di0",
  "b0ff11d79720bf11a1ba62dd095745da5759a999ec57182ddb73ae2d37986e36i0",
  "4625a8cd451f6c4d372c0b2e769869281f25d2ec29fa665618b7e0f46bf5791ci0",
  "9cfb4fcd2715f5c78e5b0dbee8f123839a88d9885922a50436040ec42552f618i0",
  "2aebcec6fc14fa78c08c74c51dd65b393c69f6f00760a0be9b77dd97b8de9d01i0",
  "565d3d39713410a63891aca405fd1a450a5b8483c2da6034080b0fe3545d6b4ci0",
  "3f9cacc5067c186df32d20823765072c90462692fad27d6e6d1c5d0c9ce5611bi0",
  "cde9f3bd8099d9d074ed1ed37786df1eaf0019fa05457227903de87358d4b4aei0",
  "6e908f6acb7e5a732bf1eb3c9510415abaed87ab33d04a212595964a107cdf8ei0",
  "05de63544b77b70cb5ee2faa478373dfce2173b0d3c2d733122c43059bfb7455i0",
  "aef7660a7db3ef9a7f9b98c3bc462c74d8e4fb6400599a9905d8ace0bb729b60i0",
  "167cae5431efb8d7596e6616d5ba1df0ce86c0019320e6afb541768d6f2643b2i0",
  "20ed4c7594c58747c34bfe8c4d0ba4bff9dbc052fb3c8ff5d8fb7d15f23483cci0",
  "8170154178e9699e7870e09223eab3ec4ba670f2b62fa59c62088fd102e3279di0",
  "564402636e592d5dec90abac94962cc4147d02bedea6b45fd3b37775bca3e5aei0",
  "78823c1ae3bc8d0a92be9edac8922dad50a355348413ea70a9b57e1183406829i0",
  "2216470ff63e50d9b974f2548eabb21e702799e16b70e281ddb106661d985fe4i0",
  "8f409e88cc86c5a4bd47aa0a77e94b9848198a72c85c022b3ca834c2966d78fci0",
  "8fa478f77ad05026a26600ff9ad82b0732cc562ed10c2c066a6c93e5464062fai0",
  "7982f52ebaa6f7d13e2ca93e17529287d09f54cf723bc44357a7b80e6452f8a8i0",
  "38ae859920419cd799fdc7cb9ef3c77bc2009ba55102bc13dbcaa78a4b99ccc2i0",
  "8095df50542207b8e7e43a846b17a5cd75afb25e3df9a0c922ace8f963a28e21i0",
  "b0738ed676da3f3748a3f9c6e62724255684cb80e531ab052b84f72ad1c26917i0",
  "0b23870ddd4f77f039040e455b9ca0506b39a6f21432bad2c8edb51ef184b642i0",
  "c027fa595d589cfef3d067b2f92971123029291b08bc1c624697100066436805i0",
  "130751426790e8eb708cca1f346c0f09564d88748018dea0544cc10e69fd0abei0",
  "59143a3a9a110d89f0fe82b577fc991a86ef7d7cdd6409b06109bc35bd18d666i0",
  "10cf91a20a9e56a05d173c46c11db873016cd7cc8b3fd7ac0e79fbd6c034c05bi0",
  "5bd651ac0335e70062fedc1fb868ce54dcdd6a17dbf8b2b8b4fce9b95ec73519i0",
  "9206a672260afaff11df08f38bfbf98651fce0c5763f732cec4481a3a4a7ac97i0",
  "86a5691d3eb7f2291add258de6c920437bd959dd8000ea371dea6d005eb59828i0",
  "3088cd1665023235de58acaf11eccc3955cc66e5a9dc7fbcebe58a36fb6d4f01i0",
  "24db8371c7e7eb5b1fd24285441f2fe4576642b133664f701ef865937a0d41dai0",
  "674e263fdde71f9e1ae790f82dca473fa8bfe75b536f864f2cf35ea66153a3e7i0",
  "6da379182e7d5dbc790010b77fb13db15ab6d9135f6c816bca62725a61ccbba4i0",
  "009ac2b1737863613ef997fafa8dde4193bac6a2bfae7ae9ff44cfcb17d97e84i0",
  "39e7d72e5e7f68a93f0652d0e61920f24bd9038fbc1f6173de7dcbeaddf87208i0",
  "b6f594026ab4b44cadff9b6539ddb26f0dd820b24590b5d33b660b54d671bd58i0",
  "8944aa82a087ea5ea8d1cce280d860b4769baa43be843b86f5efc647789e8364i0",
  "f80b5c80d15ff059f424d9e00dd1357e90b5dfb2ca007c4042ee21611077505fi0",
  "d4d760ae2e956bd332c3669c79f179f4160aae4c5084b4c40ea29828fdcad06bi0",
  "7bb273d5a894ee94cada536f724a4d1e82ebb9c5886daa9d732ad468dbe07011i0",
  "5fe6a05d0632e432f1ba032bdec30c3a9e63c04fbd240cee31c21fbf2930f226i0",
  "363b66a3e3bdccacab4519f850c39cc6b67df0d92f2aaf88f0e033466cbaf522i0",
  "88b27903926586e80d6b468ec5df02983ee688914fe499ca264007d35744e880i0",
  "f62ff15151bab340c20f1cc8797df309cdded3b42e2f1c4dbf72cc091507c9bai0",
  "ff7ddac2643c24ced15bf852c120ebf6601c7c770ae25ff4a808edc228472a4ei0",
  "d1e4d42228dd7ebd4ab7870cc4af206c33f3c49d3ed46928339249ce5b7f96ddi0",
  "8b75ba3be2fd5dcb75a3dc8ec4a60fc9b764ef87b7480120a6f688eb1f9d2e56i0",
  "f9e430c420ec9016cfab0dd2b276c5ec285d7d2cc8b17c2e51efdd2fcd1f5b3di0",
  "30dc5dade461e15de418b92026708881e64932a3ded8260c712d11ec2b21d3b7i0",
  "b6d95472880fa19853f115f383663eda902470cd6e4533efee99e40646aaffb9i0",
  "85bf8f94934e11b5f9a385fc6763fb7ffa9c3f90b87be664ccbae75f5e4eb8c0i0",
  "13bbccc955e0b9b2a3090b7e559d520fd2a11ff53757908995eb4a571a2e1210i0",
  "e42bb0ab280bdaa884b077f1bbf215d12647f81d70ccecd5e2f74f598a5b8537i0",
  "c70c03bdefa6db4539c4f0542ee0dd0b4a7912b576a667c77224850d5b12e3a6i0",
  "bf023a7c800150702a809e6c4019c0fe55fe1243d539b02f5d30e003403cb3fdi0",
  "27b34f47302fc8d061fce3b38943ead79a4085abb3e398890bf9589f8175e86fi0",
  "00171c46f195647529da8aea7c8f1ee729bf699285161fd60a97aa82bd5479d5i0",
  "bae4a6a898ea5e064128c13c962452df66e0d7ce8b8508d7c97d30bdd4228ce2i0",
  "5d0c21c9ea03d251fcc511cd7d9a7b471a2233ea47de2d711c6920b0dd09a3ddi0",
  "a10320c5499c03e2269ea640077728fec0b3cc9fc0d3a5bc66b3afd806bb1416i0",
  "145b91496e40a7fd70946a8874857a111277b2689885d8e23cf826231c6244e5i0",
  "c2e09c818b4bebae254fe16aeea9520ab908ee4ca366b1f4cfd96730769e8f34i0",
  "760c843428243f56f414d33add3489462b7d4c93b19eb02c530d9868c4560313i0",
  "dfc2a5bec7df479fd079aecad893463b0ce632b252346cb4b42c9e6af7c0e24ai0",
  "dfeee12f2219201683565a85981b55c4c055a4444325989489ec98e406d77097i0",
  "570feac187d5ec6878c7ac7ccca56c9c6f44679076630413bb4ce22fe90e930bi0",
  "2962b724d61325432381f568e6199a63d070baeaf0837633d3ddfb6e30baa43bi0",
  "a18aa41011308267c1d2a3854c55d2a1ac46b2d4bf0c2bfcded16416e7069fd2i0",
  "c84bfa52d35262fd7c41b03e165765b490ac6acc4c1b9eccdde1f6534c08729ei0",
  "517772dec85e0a4f221f508c9b933778302e7b7bd94c8e810ab7dec28010741bi0",
  "73c0a6ef586ad815ba56b65903bdffaf118726b3eee280af3e1be8bceb8ae785i0",
  "c8f4fe90f989c7f6ef4c08f012e5c6e12163830f9f925ce444ad2c3ca2da760ei0",
  "2b64e7475e9af92b79d42e422192748193cb7b28b086c72872c48029d06c5c87i0",
  "be00f5f0f49b2064d20cd069003893565e3466dbf0c6c5c37d26a3d11edae0bei0",
  "a0b2abef71e3f9d1d8a521f169a3578f1a65e6b18f4e0dcb7dd8794f8492470ei0",
  "c6582d281296f812b64cd4a159891feff8a4c9708e96623ff7bca9c93195f9a7i0",
  "9d747c3def6c4cf8087798e38be70bcc6085330a62ef3790a1c050af4f5decf7i0",
  "c5d88e364e4c530596a425d5462d1726d0dcf8580e1fa5c4368018ea228f51bdi0",
  "9ff163c96db6d97cbcaa2146475882cc023693759f3043992d1fb66867390edci0",
  "26da11336c97c24d22d0685289d0c07ac506aa294c49c6d37f0f1d3231d6458ci0",
  "dfd8c6e8ca2b392356e66b2929e67b537977cfd039d8401a193d04ba2a49e4c5i0",
  "c95a8be6f9047a69c49578c8406f0fc5c6a54607cb35d53905aab2d0f9592dfdi0",
  "e276f2a3c9b421d1a6d81d75cb0ad438d8f77145707bf3be05db492ab38e9fefi0",
  "21565fb9cf0c236f8d9d8fb221d26cf721c260597fbbacc07e724a8c25cbb35fi0",
  "c6ca5855d4048a5ccdf17318817062e36b4618bffaad148ae3b2f2170d3af7b4i0",
  "4842e9f1dd648940ee2dd0cf695261c3591644b6bcf6efda22badbcf6d65f3fbi0",
  "a29382aa2b6e0a070e620cd164724c21dde81ca9cc02cadda5b851b88bbbbfcci0",
  "2761b35141ae1119872b8b9f76f98f5d437e55f9be707168fa964d430b495d08i0",
  "cce0af95008e00c42bb0e51e95b345a10f5e8e9d11b9204a83be439b5a8ffa72i0",
  "f352a2d88dae454a4c1809855f53ffdf03480974565fcea02ebbf516c5733613i0",
  "d85285f4c0b7328d0a8c2bfcad7dffac24954c70a7bc47060cdbfbdff571a468i0",
  "fe791ca40c079ac978ffb2f05c49b9cbf77d4ce57baf23079f306115e378fc3ai0",
  "cea5b498f13499191a63e991f85e6cc8ae7a81719b034f7411a0eb345252c98bi0",
  "d9fd7f1f3600eeb90be6a580699ca4d6e7c169067c600a5ce710123edc29e6c8i0",
  "2b41f633f0604acb441f5f8f377b234515b6a15dbfd616425ada8806b58494cci0",
  "1b191e8f81fd78afee1016a86840175eb86a67dd953847c7eb32da60f6a5a962i0",
  "02a69cddccd418ec7add066610fd801e6b157ca1a248f54cb314c2e09b1192c9i0",
  "e94ac8ef8449cdda20777db423c92ca2bea21467a00137f5ca0b9d9ef7fc9671i0",
  "3d0377978eb953800e2666e090c32edf47f531c58bfd9e2866e8985aa59e901di0",
  "3d19935b8d9cc74cdc21a075242dc5ca3d55fee90dddc278a2ccef4a177d104ei0",
  "21b7853cb094082f2f3bd14db145b45d3fb96a1ab28c176a009f71c12faf3b0fi0",
  "07519548930543d474b107bee1f5437bd50004ce0b1e4f8b015783367787ad1ai0",
  "31c91940203bec0373e2876961f88b03357f86547c7ecfb83dcfd8434c9973efi0",
  "463f3a9073b1c0418cfd0f3486b9a48e7cddcbe6abe78bb113f0b63e86f027b5i0",
  "26184208529b79dbd145b54ca18dd8b4f90fb8bd85bdd2668b24c0dcf0cdec7di0",
  "02077c5e43a6123ed78489835ce91a595173cc01d6d03d92e47955dc0ab4468ei0",
  "d18ba815d369512f47b3bde23e4581dfb7307ce7ca23a8ab76058d2a0f811593i0",
  "0a635d85d15124d6667ac580b345dbd4ae1523474b0b42ba43df295722e9754di0",
  "598e867f15ef111ce769ee9d4066062b11b4a26fb12156ecaf32a133540a3c2ci0",
  "cdfadac7880fa8a58d59c3a21bed7e71c70f904872989f5dcfabf24497941c80i0",
  "62d914ec18eafbaffb609f3740e4e16835a6f8c91aedd7c8c28ed6ba9e9f806fi0",
  "576e954d97c5b651b2a7e3e7b3313a94e1eeb18b7b74c47b86ecc190615a365ai0",
  "f3f48f6ec8ca20c52358ec7005b2686553bbc83d05cefb267856986f7605fb9bi0",
  "be2978d6968148669a18fde7c196068f950ed76fe921d8c31ae64f4de64c464ai0",
  "0b50616c1c6a72a11f249f223b7992ec281b3d395a6fc284ad9c0799ef9192a4i0",
  "c958e0b6d0c8b35854b8a2d899108d90a001513b77781b53afc0762c79ac93f0i0",
  "367a7ba394dd877ca657f96149399eb05c1f2ebbeeb4e2896f684a4b9bec3d42i0",
  "443aea3d04f1e6bca38622be2171c2a8d149a4fa8968565b8babe8d351eee772i0",
  "c76e082acef14b02e85c9dd58fd10a455de0d02ca048d389049baa2692aac760i0",
  "19d9898e30101239390ef90aa22c15972dade19ca8ce33a910c13bc17848696bi0",
  "4b6d934d081510856de5bd033dd75db7cbfbcf41c568b30207347721eda3906ai0",
  "3b5daf4e8ecbaf6a70f107ad8df9bd9a81029f80efb464d848e6bfe5234e038ci0",
  "5047780d3ecb6e0c7fc23a603ec77e0ae244dd9ce3296852a6e31728a8423637i0",
  "26c35bce55792fbebc3b162dc095dd77453343771d89fabc1b3dfaa1ad0be877i0",
  "cacc9dff7f8d7ab935d95515eb1b7b68bfc65a430956ecd371adc359d07fd4bfi0",
  "92427ab07b159614ce1c8e5b1efd8de599efb88c021bf80727718d5e79c17b16i0",
  "76001afcff291eeb98c5425fa6eb0a3e9266f486dce6b48639f5ed6f0db70495i0",
  "e0e16e43e5409ee0c4074000f802ed9f06bfe3340898ce1e476a73b72da5b4fai0",
  "141f165601e801293f14cfb1fe592c2c9fda49c0c66a1a9a94b669cd06f80627i0",
  "125bbe3e6d6c13682c097500af9d7872d5f53ba9788c372ce5d9a1f73208cdfbi0",
  "26bc2d1a4a69a6c80e770bc29601e5a4960b85ba813ef823b0b535e027c2b09ei0",
  "66f43e4bba1f28f7959a2447d2056420ab828a15a429ea0f474f879c0b2b480fi0",
  "218a76e694805bb7da347f268021329bce48b54db57e130039938ff20705a7a5i0",
  "b3d3f620f5089bd2a9505cee99afa5ed10f6f7d8f58f1033389e1305d70cdb47i0",
  "87961ff708114083f7989b89a01489a1c78f5ed969ae25bc9027432dd4ef72c5i0",
  "d34c8c9a7ce6872f93fc7b5288bb33394848380a18c1e91159108b2c35554f5di0",
  "3ef7e1caf24cd828083ae1c7d6cdcb803f6d70949bfb13c6ac88afa50fdbd3f8i0",
  "49ee294d89565d38f3f322871bcef293aa001fcf0cd58804610a8f2916b90e15i0",
  "504a858b75b224ed38fc782d0c38d1151f7b99d3f56efb33f10affcd47b59a9ci0",
  "47ffeb9fcc1aa744c7d1f76c1404fd6e76d9f82666aa026158da49ccd783388fi0",
  "10e3386c01d7c7bba6a03b6f578ba8ddae1211bfeda68e6e28abe9059aaddb2ci0",
  "175f3c0a4b23f5b0a5ab5ebd1fa4cfbe5e2ec7e58728ee30239015a8dd9d1912i0",
  "c53ba0cfed4bb0230c369d30216be515c8cd5f43406b68080b9034be488e8ff8i0",
  "9716425d2b84d047d2fc290dd48b2c8cabcf032fc657ccc72ce40d75e7ddf00bi0",
  "c287c0149bfdbdf0b900b4e44f4b9a23dbabaff25e01dd8d6b9ba0020cd9a60ei0",
  "003fc88a889a53e64d68edfb0a2fe609354c152dfd987dd90fb9f87f1eb415a2i0",
  "c9caebd342eebdb97e2044fedad166d7474d7734b2581082827d863bfb3afe3fi0",
  "77bbcc29a1882a236c37b5ae69cb0e12895c2529af9c6ed46474d8a97f2ebf3ai0",
  "933b0929296c30c4cd261bdfd4e4c8105b4ceac8c0a4bd20db1141acb78feff6i0",
  "ea4f20963c5b19527bcc537fe11756e2cbba53c905e08053193dd21cfc192deei0",
  "876af4f4d114e5ed780ef922b4a61c4e202164d1c5ef82e6869a0d8189cd03eci0",
  "a36bcfd4272c07ab5fcd294a5c9e4a69d350c86d043190781f196f1fc4333ecfi0",
  "6924d4f461d1ce2a902b39656eab9fe0f32c2f8fad508afbc912791d9cb3f1dei0",
  "cb89c9789a36f050a2ea6b45371fcd08a71d3a8821f3ab06c26e61787668d23ei0",
  "7a2de6afdcc35ffbac8c46aab6452967305aee4f0456f47fbb16a1437fb32ca7i0",
  "8500c664e45952cdcd2e4855ec930333388c78e25b7596a13e1f9aab5ae52974i0",
  "dfb6b2c65ce23cc0d5bfa19b098e4eae637e4e53c1c5e9d32b3c41879c3d384ei0",
  "373ecbfd169b76d33cdb2ecdc7e41afc462a942d3cab223a975b26e37161122di0",
  "0a0da60d58b55e6ee7b844b1e30a6c821d9b35138d76b2fcab99977eaff2fde3i0",
  "07d7a0d32dac1e06c248348640dc605bd1c19169db9dec0a9d14cfdb4d2f06fei0",
  "fa84447d257d0ff6f5d66fc077afa8fecf348bf89fc2c16123622b6a4b147074i0",
  "6450632213ab90c97dfeccc9555306a09a31eb412f911b173c07e75622e3862ei0",
  "67cd473f2debeee4dd1dc2078647aa483661516a66343ef67089956fc5716e9ai0",
  "c90e8391d6e4e2518446cb2bd6fd3cc0c2f98233ee36931dedc0cc1a729eb149i0",
  "e6c45d418871ddccf7744ccfc37f601a6aeaac73f736d765596e519fa49c675bi0",
  "3d12f3db6ed4e212f36d1d30004eba95d30609f6c1fabfdf376ef8033658c7c0i0",
  "874a103f811205c13b06f149ffd6e81879d43c898345b0368c61c3c5fc94e0aei0",
  "d387f2deb73d82e5de6f9311a01f5bed8173349a08a261bb2324e3b2462d91f7i0",
  "24b081bfe4074d8efb38ffde3192cdb978353f730cb640291da4f0cbafe17dc1i0",
  "45606dbe5f084eaed9fe960c6c1ac751bee2b4b6b4c435bf566751cb93ff67f4i0",
  "1c15af2eb93f388420db9ca087cfd94747d51e59984e00bc9137d259f1f59af2i0",
  "c87abd18312eb5f8f6a61c518a013185c986c697a47f7b6d7b41ec014fa3a5d7i0",
  "f6aa130a1150e0ec6e433443dbd6cffb37ddfe127a243cd5a7329a0787f4c9f7i0",
  "e436d2a23d3060f85a5a67ade200bbf4ca979284a7a90744da9e3ee8ecbc8f9fi0",
  "9f9c624457f71eafc68363871dff65b9aa9ba55adc00f36d47a35580199cf530i0",
  "3fbe811e25980c6da44f7ba4029fe1a89c5bf1635da3eee00e7bba0b735aa602i0",
  "f65b42bd8479df460a318f8e13938dc63bb32381081788c42c58760329a0c4d0i0",
  "95a435367be7dc119c86288ed4ca41fe7f7a8c5f0d15ac011e536d05064e07d9i0",
  "951786202d47e1d81c949e1ad872126ef9f8af020f2ce31bb7590900a945c660i0",
  "d8ee984318cdb7fdf215a18c13b45df70571abfaf3585810d63a2c5f4afe5286i0",
  "bed9e4ae4270d4b1399cfabc7de76ce375cdc40500ef606cfb3d4cd48d40b597i0",
  "408af6bbe17204a9ffbebc58cbc725e21de4ef8435d526b54aee9b8f4b0ed10fi0",
  "4387fb4f29a6f06ba3f0dd2ea62b3d0a8f6cf70cb38268bce05ae1fd0265c036i0",
  "29009a369827268570b75e7b0bcda92441c0537394bd749b8c9b70090faf55cei0",
  "1727e1949aa404702e9ae63da94bde301ec93db88187f74ef0fe0302a563a4f1i0",
  "7aea79c766be0d84723439f988c23efa04254f605bd7dcf70479f737e09fd679i0",
  "08ff6370866c7d02181b185c07b93e217022ce68476e9fc46cdc49bf82daad26i0",
  "402a169ecc5772682836488c0f2cc0d40ad882d3293f700709f1a306ab5a0b0bi0",
  "2f775bfb1adb07745dded846a52ca1a0002eed4d96daad4bf50830520b340817i0",
  "df539db6a61fa0d603c10c05f882a10185b318fdb3059d0c6eda19eb52aa686ai0",
  "6ed4b57edd639eb8daf7556e965cf09340bc196409a66d397a481ae35c796a6fi0",
  "d6b70fa0fd4e1cd85f83ebd15ebb9b001fd354d0f315f5c7f56fc11a57a42d82i0",
  "7f4c905bb671ab0887c012c39c82725220a1cf5cf32aa2d90a6bcc32f88bafd6i0",
  "c7d4acb86e7049865762f6c244a50f778e9bd38944fe62516dc7e0cbaa6d1fadi0",
  "e4d11c1911c264ca2ee2500f59677ffc28bb627efbbb7c514791c4eff475660ei0",
  "8cc4091521c859338f20578c1943572549998322b525c65afc42adba073cb2f6i0",
  "d98725fad94a3824b80b56726616f0281c925dca9669bd85366f36173b38ad27i0",
  "b086da39486ece85915fad741bd05c6d53d5cf427bf93210a8d3b1036d190951i0",
  "f16fdb571f856732a7419fc15c92e23c8cffe0b309ffa479d65fbad67c03128ai0",
  "118cb35a0092904308510faea24a2edf4cbc965d150bd3a17a04ad9acd18a48bi0",
  "47b44f1bea129063de51f0b2ca12461d85722590c2c7e7a7c486231a0e8d9157i0",
  "f83662235fb4c9548a4ab8bbd529ddc7cde850a7ff851e81e5fb62c9a64ce7ddi0",
  "cad3375e0452a1d428553ea5ddbce4a1e18335c8314ccfd75ae35a9e2df9d172i0",
  "91906fc3bd1bc9abaa1be5cb8ff0cd8effa69089e65be1936f813427a7402257i0",
  "65c394855328adbe3af7dfd29c92ce567c7017fc367f9e85902c645b153efd69i0",
  "11f557926f4485a15c4f0a2428c0411bfb7d4a50a8a409a355f251e619353501i0",
  "95c6cebe1380eac63a22f97c41822bebf6d54cd3b3a2fe41bdf261d9a0f8f201i0",
  "9edd4d0ce4a276aaa920a855dba00b1306f502162a766ee94e798a5c3a374f80i0",
  "e315374b3fc3cd07e7f8bc0f9f7b845b5aae149728877974fe5be1fccf626ed2i0",
  "ffbcc0f4d17537f2a70c48180f943e2c6c0238a0a2aae30a8135f788bbe86a5ci0",
  "a969c4d17c3966dd0f54a9a914296889f8e8bea03609e64d9ac0f7b08b5a5362i0",
  "92f855846868d7d8a916ea7d006d4e719776fe382f165e583eda541d0ad60a01i0",
  "d298e950106077f7f7f38574ed4ef94ab489cf48a6b4be93ebe1ae69010da424i0",
  "44184a05d7fc0c95a944b13208bf50b735e13597fde60cd86c2a2c02b2aeb5cfi0",
  "2b13522c57a7db59154344084b41cbb012407eca65acc6eabe84c9a031d98b3ci0",
  "fdc85aa46ec332ad7bd49a538cc1b4b44b54be3e86ad2af7ff3d0a5171125676i0",
  "874d1d1b7fa290cdec053db1633222ee9747007e9f672dcfadfc753a23f55696i0",
  "3045232feebfb29e03e88d240838cb412a8aec8be0fa3acb8b7e7713ce0b4bafi0",
  "be134a399b336a4209ac91f8d18630b4e726eb144afbd16dd223a98315fc1f79i0",
  "5a440f750d42c35078d2412b4e4a60bafd5b086e9859d4f5f249d90f7b826a9fi0",
  "424c2d6bb8a83fd9a2b67fb701fa2c15bfd753e83dd8f19ecdb4fec6bce42c81i0",
  "dbc69c7fe0838c856659a613399213bcd69fbb67bec4d08755f7df5ac21b2d52i0",
  "5b0a782160daad2a54025ccdf4f62e527ee53edf006a1ce6d39c1e894f673746i0",
  "829651c30e99c83cb92d4d7d7956a7c31bb3aeb6eaea510e2c61874bfa0ac820i0",
  "c3afa53bca169cc8af49fa731cc0d6f21d56f63affc5598629a653029079bdf6i0",
  "cf6290d7e0ad6708bd0f38a97f5509f626bcfbae0c2cee0c27963246aef182ffi0",
  "58497ca2560632db9106f9be2172925d6197a25e7d2d8ffe6d4bafe554a3921ci0",
  "f0ec507cdddeb5e79aadb75b2c3b5703a8c0d66948abdae9845c05bbface1521i0",
  "0bd8598bbad53e5fa6b560d1c1d606b8aa4b7bc8405ccc0840d50683f71ef362i0",
  "6987190c37e372b59bcbce9f4bb3d953062fc90f6de651079555a1c13de07ef2i0",
  "1e349bc0f7094e459e30519a5bfa930fbee07546a69f982b5a69711e0a7d2e5ci0",
  "f1816745b3967627a3f397e3e25ac24cc74ed5b6ad8bed37e4c8bd72f083ac46i0",
  "63eca87f148185dfbdf2eb7a57bbb02858f264944d50a701330df8830c3aa388i0",
  "028ad6bc1c481a01db47bb9a6ba5a833d566f01e2f49cdaa94dd0dac058656a1i0",
  "cba7e792c0670b9f35cc0d86aab667da1f52422ae035ecb88da0a581f34223a0i0",
  "fc839c8954ead943fe4f22dc4b0bd18a7060700bcdbc1cccfc8107847e185e2fi0",
  "686f8b686a10e3e78dc04cacbb24b22edfae191ed0bacd5dd904412a420c7a5ai0",
  "b21841a5518dabfefeee8e1f1d864e450186da42e07a7dc77f3c2e4cd535767bi0",
  "3e9a727cc60dfce451a0facab501877e5abadc326d96e342f641d4cb3d60053bi0",
  "933f2af0698d6350ea702d35bab78f26e2582b89a42c225a46b19665615ba4afi0",
  "db8a427c90758b52dfa80e797110749f8943b389177f659ca8c33a390a91a3bdi0",
  "2e2aa2055ea068db7ec69d410757218bc52fd8568fde10a6570705d80996e038i0",
  "1ed723c7a5c1039b8e313b4ddce68397b91e163fdf51627ba25b5c78a612cf6ai0",
  "bb8e81216669f6b7b4a3d6784801e8a7a2d7d66d2d251c5685a73fa85f79988ei0",
  "cdda0dccd4c49ba9a119c9e53d58a6c6d64fbaef16b5c16757a70fd799334616i0",
  "0a78f81fa86a321d6644224beba9551196a38c6774742cb4ba13e73d79dade06i0",
  "b06bc4bbd765ca8e0ce26b1713a4092e3146fe394208a5f6e746aed863908b80i0",
  "9ab9dee5a8751e138345982570823770f94ddac7dd7d95faba16aa922de4a524i0",
  "41a743a186e307e723a207fc0ffbb85f9d0e93a2f3879d3ef999ae3cd97ee4afi0",
  "818caace4bc6ed8cfc9758cdc22808668bf6b38ab679301580a5936b37c96da2i0",
  "bf6169f62b52b9efdeb86ef96f4c436d3de4118c33a9c2800cb96b38db31a8c6i0",
  "e490b5c426d15b185b0e652fc177bcb86614bcb0fb3be646dcd685ee90e622aai0",
  "e8777ae498baff14a31a40c16c151826998fa8c56a99d5705dfa436f63a5c15ei0",
  "71d6a57ddae0284d129ec2c6ffd019e7d3469de2af13de698a2d287600639aa4i0",
  "c9ae606515b4ca3bf5ab21292e4af88fb82f3ee82c7c1c38745c339c6f6e1c92i0",
  "72056ef4ab251f605808740ad01b9234c304eabcec3152c4a0ca57160a449a10i0",
  "5b8f31689c90f8c86dccc9a8c3a14aba74aa8bf4545ea8a5c2a490d58992387ci0",
  "a0c7c6f2d98ea592aa0252ff7b1f327b445b52e84965149dc54d1baeaec3282ei0",
  "2cb65741ce091a8431cecef30c997afd94a7521bcd1bbd68bc4e9a804980439ei0",
  "67a0c712c773adaa3ed6d7f76cd6007610e3270a2faf1f40c21d5e39f6bbeab7i0",
  "b1d42aff2d3b67f771098ea7f5e56610d2eac35064767cd56372cabb655a7628i0",
  "58c6d3613ceeddb38b231bd8cece573851bb66b7c417f00fa2f40736df661971i0",
  "a0538bd91730113c767de67dc76fd02b363851ed0147c985e27478a525a4ebd8i0",
  "fb23e8a3665348490d37f8ac2fd55141f4a7b6f2140d16b7e088c89b2c64578fi0",
  "e4de67489d12a2f5b36bd6b431b321f22ab2d2bc67af49292c3b7c9d7ae1515ei0",
  "43be1103e8bc288d7f37e92411ca5abd0126c71bf68dc3d0cb1865880b6713f3i0",
  "e67ca760815116b37d57ab1dc49afeba2705b939b457ac85e8d81b439270b173i0",
  "946f9c2ec1a7d33b85fe80ad3977fa8c24cbec67964120cdebe102aaa36229d3i0",
  "b08fe2956251e3b7cdba9a22e09569aa05c277f07ab59d5c03234b9e6b220c5ei0",
  "a955a6a2f18956533367632faef785fa414d19041620167296de34e7b1e8af58i0",
  "50f7739ed608498ba824210417b3a4e99d72cf5639690a2d00940d0251d93557i0",
  "a41bae7bb56eac7bf50250adf8ea7336dad66ed4daa88be74d6080ebf97a31ffi0",
  "c6ed5affd62edbd9f3d366ed5f379b740755b195993195105ed6b3fa9d3c292di0",
  "89d58df29c8c247209576d557e7733e8fbc988cce047385b9dead7154020a971i0",
  "61db2a60f5a20d1a59f0f849a9b1f7e2c85bc9c895f2d34cc02d4aebcf3d43e2i0",
  "bee9669db7624e1c33c24b757bc84ea8fdba627843a0c40dd89631720ec86ad8i0",
  "5acdc599c10b0c85fdb6e1ae0874d869f5631fa080f1f25f02093b06066b0d40i0",
  "96aed8ac0fb19690b3d94bee9fe0bbf557f17796f24cece4f88711f3fb3f0f19i0",
  "09d69ab05878dff00b5858f5b5f5dad4ae7c8d9e89a3737f14a5e41f70cfae40i0",
  "0c493c8b7b10fccf2dede93239e4907709996c89dacb670dc650486e887ceb09i0",
  "8f289301847e5fa588e405919a2b7c778b6fcc8b10709ecf189963c32a3bb7d2i0",
  "3f9c939d4daee3406662e93fa17f463fccf84f4faf03d241bc7d2f91e6464df0i0",
  "cba5d4183aae73bd152876b89e835364f9fdfbafb2921d3dd948d0808c53bc35i0",
  "ed26fb96f71ad45186ef2f283a51cf5f075e6c21e8b38a6da23cccb2929948dei0",
  "c2a0373beae3c35183349caf97f3141b5e176fb6c3e3fe4bdcf7b73b90a76de1i0",
  "db25d50cc8691c17e74b98c5c44c0e30c70dbc18781bbb8fdcbbb29d9e9b161ci0",
  "c4759bd93b1e2a57e77d0e554b7a4199cbd2f861d2f71872d388f35b5f78e793i0",
  "1bcda579829c6cb84789b761595cebcd342c6448744d08a65cffe05ed622b105i0",
  "52d92cb928d7b9a80ef7701b9941e2e15b6ec1adb70b5b6a60978e6ec9e1865fi0",
  "0bb084f3206d219c6ff95a28899495bcc77d3fbeaaf404041a9bc3d24f8575fbi0",
  "90e69792771768b9b7bd1b930763efe683b520d654fd50be0ff1e10cebdd45c2i0",
  "4471fae8e69a72a445bcaf122082f22d55dcaff79f67d1d1f08215225d8e7d6ai0",
  "ce4ddfb25517b175aace90c1944e6df694dcfb5075b2899e2139d5b186b2202di0",
  "04c4e17ddac3260a9db75f260e09ef3590fe51abad150e857f9c69c0e985ef76i0",
  "3afdc3ef06a957b20a68af04a798011de9f8af24701bfefb2fb9e5fbd439fc36i0",
  "fbd297a87eb3212f68cba26bf50e5b0f2c4a4d668a1d82eede6018048b2b201ci0",
  "e1f9e527fcfe0261dd716664c22652461d122afb6174f2c174daafc3c69c3094i0",
  "7c782e43989670fbf37e288ded5dd839b6fb2fb3dff2baa7772eb1834285758bi0",
  "97b2ce2c2f087461eeb2b031fbe1787c9cdec71e4f145b72d6ec36df3b6fea9fi0",
  "23d4b7c83d5084258ab99aa5e99ead047dd9e6b79b0f35bc5a6daebc6ffcd994i0",
  "cdb5983f3d3f12704b994ab677faa4fc46b99590f91158ab31b447c21981bf2fi0",
  "604e06d6505572965a307a1704898cb4c05233f7f88954e3b3e24fe93d45fdeai0",
  "9c0857a90b5f7db05a66b8e4ebed7ecdcaa6f72304507c65d041a01003759034i0",
  "f21c9521970f8e70875fd74f79f296bc24ceeefd752c7efcd3e27acefaa06d6ei0",
  "a8dce768d25ad82354e8ebbb6a894b107eb45afeca7fd81f59fe865a59a65ebfi0",
  "a263438904ecb122f49b984e1f8debdd772390505b5b378ffc035ffdc0754513i0",
  "051aad4fc1e74d93e2dd2909254225c9d9adf75a7d14439b15bf13892321e340i0",
  "c740d17ae2da0faec0f834512414ead696b29d65010b93464e35e3a1b6f2a5cei0",
  "ed5ad8e446c251a1b113b7e02ad548622445608873c20d0bcb72f12c4c8523a3i0",
  "4bed89b116fa2330aa252267dc30ca5ac438cde35e0263a952b0e565eb9f8bc8i0",
  "24c10f939c99cfbbf4ea927579818cc33cb6d0c409ee90b0f0ed2c92867438a3i0",
  "01cca90aaa4c1158cd30c2324ccad753b0f3418356899bc6e4727b341115ebffi0",
  "bf85b9e12d5b970ca1eedabfc1b5d3c578dff486f81aaa780b5ed7771b454023i0",
  "cf3f30243020e85e60348df9531295f3e741c75a521b376a271903ace4c2f8f6i0",
  "07458cd62a3b0258c31d48bb1844859b876ea3146e448bd376c97c7b03c7620bi0",
  "c87b90683ab5b295fb2d1449c4975137abf6eb22cf99fcf725abd5443c1cc2fbi0",
  "daab2d70f0fc99396faf5c1da27ab8857cd609079a88888f906727cad4b1f9c0i0",
  "32917d58f79c0cc66f0abfd6d65008fa72f9d2451bba000230ee3bd1f9c668c0i0",
  "a9583b4f0f974d1005d46e40d0b3cec546677c769b9b69b7a206ecf4f4898ea8i0",
  "d0f32bd0f18f5c91da0ce98856eeca1a91601e53c49cdf92bb9982bc9f11fdc2i0",
  "9956dc3f8980aac7104dab48a846250ce38c2f2ab9dd229e3e1f8e096d754179i0",
  "4aeb483ae171a986e2c8fc4fcdc80baa3163d9e8816e5a0d4d079f7c89cdea5fi0",
  "3da3b5fcd74893a8df6be4e78c9be64dbf9d31806894f80a836f7612e3cca4fci0",
  "3c55444d185fb22a9a8992d82895e0cf3ce94ec05a46d7bce8f0e1f9f787d941i0",
  "e81df5ad0a47b3426c81c2069c4f8e196d0af4f0efe551343405c51a449f91dai0",
  "f25dddfcdd21018222ce558fb45958a38b2fc58d5571038df664740a6a20160bi0",
  "5897e3ede7ae6cbde58ddf233c0bfd6579de9abfb4a014c05fa5f6e66d19b426i0",
  "4bbfb42abdd6a4ac8cceeb2e004986d1110e4971567f90b06700d9a0f3529e38i0",
  "9f143fdba116ea0903e18955a80a69f6168191fc84057f589a1cbc8ca9943d2di0",
  "9acc4fcaaf0ff085bb8f958e9fceee4f1c6bdbe63d214ba81be097c3ce6cbb21i0",
  "0717a69c80951bf9f80e47bd6c7325915d2fbc2a3587c41f85bae4861b8304fei0",
  "5cb9aecefab840be3e30520d5b363f0e68fd1e959a98c1b61af5f70db9a32477i0",
  "4c828e1dd447b5925e02da7396a2bc1a41b045c52233ee90c407e11b59e10cf8i0",
  "4f41c1bcbe24526659451533ddb36c5c705fd1ae8951f03e053a5cf2a97b0099i0",
  "e55402c3feef034d4f09c991bddd648d1c1ea673999931862d89678fac6a5df3i0",
  "e94df89b9cdee027d8d1bcfe9c61696a377208e75cac803c38bda0026fc0eb94i0",
  "cb80dff15c8dce4b0e5679d05b3e178be03b720cdc68c4cfa302c481b4cc3e4fi0",
  "204b1cdfd7ecbcdf1c37553f3dbcf3c1f78fba83589c427edbc24d6563ddc847i0",
  "c1ff65deef2e8d3a30253a2ee3c00237f7398679853372788bc512bbac54ad59i0",
  "d8c3d3180444b486a45fe6cf182c790e0332c3df9c0f07a450eecd171d4d20cbi0",
  "3e6856aa6dbd8b36d3842174c1b6cd8bf432425ab1ff1acba7f65c09f06b0ea4i0",
  "7b2a13efe3d94f0852f936f9121d590c69c4eebb95d8da534471d17229078a19i0",
  "124ff63915f91ebc46becd6f4f1cf6fa2e09e4b8dad9c70223b36494b4585cfei0",
  "4a3b7234af5f4dbda4ba476913c9bc5cf39edb5ed0c8d55202c029a75dac66e3i0",
  "05de1546291d476ca6e7ee8b4823dae63c25eec879a67307de4f36184880de45i0",
  "77d99538924462de22c9412f8419994de5c4ce3189c98751e348fb492243bc58i0",
  "4562c4fc8738c238720e9ba7bf5f1f282803fe45dc2a539afed3718d8d5405bfi0",
  "cec89a6e134e36635841459fabed2c7d6af458ba60936af9ecaa0253a54c47d9i0",
  "6c20b01cc6b08f8b52eccdafb2a72a864361200c0c1bb8d394dee1cac3e347a0i0",
  "4cac2b026aecae3d73fe22131b506807d448251ee0309fe39ae2c00a3dec120fi0",
  "ec9b6269fc83ca48914d8fa8816df3299fc827bb2e3564758c12f89d631d0751i0",
  "5d485273f4c1a6ab61db735f7e73129773e0df3a1c9cc7f9e92be339ff43ad33i0",
  "7534c71e4ae1f7f30e9c56969e32d788bd254ba8af9ba8e9d8ce72934fb46b5di0",
  "527f87ec8e225932b65ec754aa6a509b7bf2d57b8ad72a0bbbe341365159daa8i0",
  "9693d1d61f3317666cf5ddb28e2498db37a1ad37f3d29fb47b9eaa4c67d6c3aai0",
  "481acdc399452b28e6f59b3bc449e4f06e5cb254dfddd798aae636284f2b4daci0",
  "f0418e9f7f3a6cdf47456704485817bad9d75e8d29f24c33be747f8e2c398aa3i0",
  "bbbe922b7c4a5b4a4e8225f31f61979a63c94b6e886fce9cc13a1e70357f1650i0",
  "6d6ee7c05cac0a39023b6ad1c83c5ca71febee2e5a041848fb687d940e8634bbi0",
  "8e889f27a3a4fc0029a55fc748f6dc51d6245fdd83ae110a5ab1fefd7752621bi0",
  "64e7493f9ed3178d596a1b0635207e583648e712133025b7d7780757f9595615i0",
  "071e572158ec59577ec88208f73d455f8dc5dca27df42fca600969172a4826a4i0",
  "5d98cdb2456923164984ede261930e0bbaad213975b06bcdf2ada9b424ef3059i0",
  "f11a7470ff6ef4063d1848483dae04c498f40ed98eb59e7e2f50718dc7864e8di0",
  "9f7527a5e7a25e6f72939fe2a30425ad29df106b8e3b1bb063848a5053ce9a99i0",
  "bc641c0166114bb4d1b2533803fecb11d1fc458b7e44f31c894e7d914cfffcebi0",
  "6f7601f589e76149d4744524104e8797e913ac196623f0d1e13ebb1674083414i0",
  "9980c72f7d05a8d5c8cd739ca473891bb3a2ace8cccbfa7b997a9537cbc0c700i0",
  "b62825f3aa8e04edb032e8a87cc5a492a5651569d81fb2a445e7ea4d39e9e1dei0",
  "de29531e3e0e1449ee6e014a826b12bc3e4edd484ed6afc301d528fc9c815e82i0",
  "80de05746089de571e89d3c2d4ee5cd95c892ab10e26856e7f105e0469324bc5i0",
  "d805d75559e237293b5c5f9fff15c53ea5ff457f195d9957d3381ca109a082f8i0",
  "a36d30499eb7b59a5059f5e708511e2a61a7a02260d1e58cbdc61735e6328fcci0",
  "b37342279f3a10a04e7287b89f1b11793d72cfe94f6320465cc025bca8a884b3i0",
  "110835d4e8c5f3bd27f8827cf2a2c28a610c2fbce64a6d0d6a284315117be2a0i0",
  "19860996f053414f52bc79b61b639492c92d4b62eab5850b822f1a3510ce5fd2i0",
  "3b43c55657c522a41a73763160315077bf12462a5affdee8bf8767b8f37ee450i0",
  "42d680c3bfc14ff7c1512f1e2ee9280557b8171c2130947a7cb305dacc505f24i0",
  "e6fc50f9ef030b67bf1a363ed4451ef7c6aef15e25f808f6c0c36d0e9a35c8bbi0",
  "e024ed5f00f4c40ddb25c0aa1d0ad2e1e024ca3895a791f522650ca406435806i0",
  "7fb640b4f6805d49d51441161483eb25ba6d69158cda51c0f489794ae09f5c0bi0",
  "c39f50a1f91ab83c90c758888e6a222f08d12d12ba9bc4d0add4c1a6ab757edei0",
  "deb6dd078d3c1b6fafb0ffa67033198f66dc7e96a72dd82621defda131c4b806i0",
  "1ff6a207951e6214d200e3a3ff04da648a31332a4d7f07955a31c7a9e8197395i0",
  "6fa07a5dd488b4003e9f8d48b0849136148eb832045c1c8387e58ef84afedd4bi0",
  "6141b1c1ad183355a92cd7fe20849e10267eb2a46d407002be14a817b4eea98ai0",
  "1c1371219aa7fa49ec141a19380ccd4f5e55593ffe22266a45091c0d3ab2d462i0",
  "68b26e39e3916a5e202422130fbf297d564717d1c5fbb746b7f5d24520d6bf06i0",
  "ef7e060a9f61b8b791583e01a97e752bcb1ac9016f17d4b8d5ed9d3a206a06eei0",
  "491a314b7b90d5d88bda95c89d9ec7f62d9aebebc5434e45266ea2fb4bc9f825i0"
]

const geniiGenesisIdsTestnet = [
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i0",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i1",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i2",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i3",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i4",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i5",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i6",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i7",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i8",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i9",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i10",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i11",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i12",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i13",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i14",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i15",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i16",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i17",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i18",
  "c16a53984ae3648a30d635f077fc872f03020e815bf1eead3c77779bf3798244i19"
]

export const getGeniiGenesisIds = () => {
  const network = config.network;
  return network === "mainnet" ? geniiGenesisIds : geniiGenesisIdsTestnet;
};