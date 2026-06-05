# Changelog

## [0.1.0-beta.3](https://github.com/redis-developer/redis-vl-typescript/compare/redis-vl-v0.1.0-beta.2...redis-vl-v0.1.0-beta.3) (2026-06-05)


### Features

* **query:** port TextQuery per-token and per-field weights ([#17](https://github.com/redis-developer/redis-vl-typescript/issues/17)) ([#32](https://github.com/redis-developer/redis-vl-typescript/issues/32)) ([0a738fd](https://github.com/redis-developer/redis-vl-typescript/commit/0a738fdd2836216be7acd1f4335a7c3c882a4722))
* **vectorizers:** add configurable model cacheDir ([#42](https://github.com/redis-developer/redis-vl-typescript/issues/42)) ([77cb289](https://github.com/redis-developer/redis-vl-typescript/commit/77cb2892cfa7bc326da0558f587eb22453b331ed))

## [0.1.0-beta.2](https://github.com/redis-developer/redis-vl-typescript/compare/redis-vl-v0.1.0-beta.1...redis-vl-v0.1.0-beta.2) (2026-06-03)


### Features

* **errors:** Standardize error handling ([ac804e4](https://github.com/redis-developer/redis-vl-typescript/commit/ac804e4c676916525d048f03f670ae27561b3e43))
* **fix:** add TypeScript type checking to include test files ([43764c4](https://github.com/redis-developer/redis-vl-typescript/commit/43764c491eb26bcb1b834c1dc658f2601eb21202))
* **indexes:** implement SearchIndex with barrel exports ([59c6094](https://github.com/redis-developer/redis-vl-typescript/commit/59c60940519a05313888c196717409b8e60bede1))
* **index:** Load an existing RediSearch index into RedisVL ([b0d79f1](https://github.com/redis-developer/redis-vl-typescript/commit/b0d79f169d3d28a4f34f94c0c474d70abe37c8b3))
* port TextQuery stopword filtering from Python redisvl ([#16](https://github.com/redis-developer/redis-vl-typescript/issues/16)) ([#31](https://github.com/redis-developer/redis-vl-typescript/issues/31)) ([72e5cb6](https://github.com/redis-developer/redis-vl-typescript/commit/72e5cb6c7155aafe9a34ce328cf499538a468e63))
* **query:** add AggregationQuery for FT.AGGREGATE ([3d6a588](https://github.com/redis-developer/redis-vl-typescript/commit/3d6a588f4f33ba3149eb0bf7e5010d91ac3f9243))
* **query:** add AggregationQuery for FT.AGGREGATE ([ed37f6c](https://github.com/redis-developer/redis-vl-typescript/commit/ed37f6c32e04abd015e21269c9f3985c5bd7cd07)), closes [#15](https://github.com/redis-developer/redis-vl-typescript/issues/15)
* **query:** add filter DSL and FilterQuery, CountQuery, VectorRangeQ… ([#8](https://github.com/redis-developer/redis-vl-typescript/issues/8)) ([bdc09ac](https://github.com/redis-developer/redis-vl-typescript/commit/bdc09acc89f050307a8f7b2816d7f997f00f2fc2))
* **query:** add HybridQuery for FT.HYBRID server-side fusion ([34c3ff7](https://github.com/redis-developer/redis-vl-typescript/commit/34c3ff7ebcfaeae929b194123b8decc61080974c))
* **query:** add HybridQuery for FT.HYBRID server-side fusion ([b7d9a38](https://github.com/redis-developer/redis-vl-typescript/commit/b7d9a383f9976f7940ec1a51e633e9cfbc2d44e1))
* **schema:** add field management and validation to IndexSchema ([cac6b02](https://github.com/redis-developer/redis-vl-typescript/commit/cac6b026be548b5cc5a1c4367cd2e32524292128))
* **schema:** add fromDict method to IndexSchema ([b3249a4](https://github.com/redis-developer/redis-vl-typescript/commit/b3249a4ce5a4326e03c26cab2a2a045e91cf1734))
* **schema:** add fromYAML method to IndexSchema ([db3f5fa](https://github.com/redis-developer/redis-vl-typescript/commit/db3f5fa6aff4a4e567bd4bf7a3f27509bc9bd4c2))
* **schema:** add toDict and toYAML serialization methods ([dc467b2](https://github.com/redis-developer/redis-vl-typescript/commit/dc467b2c3e99481f1482e0f0e2dcea671cdbea1f))
* **schema:** implement field types and field classes with TDD ([09ada19](https://github.com/redis-developer/redis-vl-typescript/commit/09ada1976e9e537bce1be5e9915ea69edddd7e7c))
* **schema:** implement IndexInfo and IndexSchema classes with TDD ([d6d07a2](https://github.com/redis-developer/redis-vl-typescript/commit/d6d07a21b3ba2f1d9471c78dfc51f22e0cc42c3c))
* **search-index:** Add async preprocessing support for data transformation ([a031c18](https://github.com/redis-developer/redis-vl-typescript/commit/a031c187a6b9d49e2c11cb9cefc1beeb510a6316))
* **search-index:** Add document retrieval methods ([a806097](https://github.com/redis-developer/redis-vl-typescript/commit/a806097975fe67dc0cfe3f53c2aeb8ba4df2930c))
* **search-index:** Implement data loading ([d7c6443](https://github.com/redis-developer/redis-vl-typescript/commit/d7c64435f80289b69e597a6a4589ac071301784c))
* **search-index:** implement index creation in Redis ([2d13a04](https://github.com/redis-developer/redis-vl-typescript/commit/2d13a04d9f244f7a960b465b4acf038e5f4962a4))
* **storage:** implement geo field validation in BaseStorage.validateField ([8b08be8](https://github.com/redis-developer/redis-vl-typescript/commit/8b08be8029af091c895d38fc083221a1cf6b904f))
* **storage:** implement geo field validation in BaseStorage.validateField ([19eea9c](https://github.com/redis-developer/redis-vl-typescript/commit/19eea9cba8a189a776b18ef212dd9b78d6cdaf59))
* **tests:** add global setup teardown and standardize test naming ([0e11c66](https://github.com/redis-developer/redis-vl-typescript/commit/0e11c66035d336a49acc7b6e1e448d4404c1e44d))
* **vector search:** implement vector search with VectorQuery class ([fb79166](https://github.com/redis-developer/redis-vl-typescript/commit/fb79166ffcdaa1da0cb0071bf65ceeaa03d52010))
* **vector-search:** add distance normalization and generic VectorField ([858ce5d](https://github.com/redis-developer/redis-vl-typescript/commit/858ce5d1abb75000ff9208a0ad014ed454ef5970))
* **vector-search:** add HNSW algorithm tuning parameters ([341ce2c](https://github.com/redis-developer/redis-vl-typescript/commit/341ce2c099a8d561adfb76689a9b33298a932aba))
* **vector-search:** add hybrid search policy parameters ([ab87b07](https://github.com/redis-developer/redis-vl-typescript/commit/ab87b07da4858d9f5fedbd6d73005b53d7946e44))
* **vectorizers:** Add HuggingFace vectorizer with local inference ([23f4864](https://github.com/redis-developer/redis-vl-typescript/commit/23f486489b59347f18b2fb43026a2b7aca397b02))


### Bug Fixes

* **aggregation:** apply Copilot/evargas-redis review blockers ([80ebead](https://github.com/redis-developer/redis-vl-typescript/commit/80ebeadfbbd12e4bc851afcc43d236c48d434a01))
* **aggregation:** export from root, handle Map rows, skip empty PARAMS ([eb231f4](https://github.com/redis-developer/redis-vl-typescript/commit/eb231f41865358c572fdb75a52fc47c6a72009eb))
* **aggregation:** preserve TOLIST arrays and allow GROUPBY 0 ([6845e69](https://github.com/redis-developer/redis-vl-typescript/commit/6845e695d4bc21a14ca6a2d7175ec2be06181379))
* **aggregation:** tighten field refs, allow sortBy max=0, widen row docs ([ef8975e](https://github.com/redis-developer/redis-vl-typescript/commit/ef8975eed4fc55654570c2946647725a72043764))
* **hybrid:** address Copilot review pass on PR [#9](https://github.com/redis-developer/redis-vl-typescript/issues/9) ([feab9a2](https://github.com/redis-developer/redis-vl-typescript/commit/feab9a2097a13af9839f541cf2938e131d2dd535))
* **hybrid:** address review nits on hybrid.ts ([6455d3d](https://github.com/redis-developer/redis-vl-typescript/commit/6455d3dc798366bc8e6e558235c4d7c5691273ae))
* **parser:** preserve stopwords_list and multi-prefix on fromExisting() ([5d29a8d](https://github.com/redis-developer/redis-vl-typescript/commit/5d29a8d604a6600e0ddbce6b6039f4275b2c5a6f))
* **query:** Drop EPSILON support from VectorQuery ([#24](https://github.com/redis-developer/redis-vl-typescript/issues/24)) ([5225baa](https://github.com/redis-developer/redis-vl-typescript/commit/5225baa019dd29f9810e9d9d20b85759f4e299d4))
* **query:** harden HybridQuery defaults and CI coverage ([b7b087e](https://github.com/redis-developer/redis-vl-typescript/commit/b7b087e725fd34f344869233fb6568eeff27adfb))
* **redis:** accept inferred client types in SearchIndex; reject RESP=3 ([f1f636c](https://github.com/redis-developer/redis-vl-typescript/commit/f1f636c938d51b2759c15352c3f66fd6aa658d33))
* **redis:** accept inferred client types in SearchIndex; reject RESP=3 ([ee52eb4](https://github.com/redis-developer/redis-vl-typescript/commit/ee52eb4fe7a2c24ac56827c5457de6bc37f8802c))
* **search-index:** fix double separator bug in fetch() and fetchMany() ([e00cbe8](https://github.com/redis-developer/redis-vl-typescript/commit/e00cbe81385bef0b2de7bd220b7a6a87faaaac33))
* use PAT for release-please so release PRs trigger CI ([#37](https://github.com/redis-developer/redis-vl-typescript/issues/37)) ([4104d80](https://github.com/redis-developer/redis-vl-typescript/commit/4104d8047e9bed4f89a29a3bf58b42ad2cdaa37a))
* **vectors:** Fix crash when reading FLOAT16 vector fields back from Redis ([37443c4](https://github.com/redis-developer/redis-vl-typescript/commit/37443c43eb632d56dfa94c230ff48f662e80f64a))
* **vectors:** Fix crash when reading FLOAT16 vector fields back from Redis ([1e30c49](https://github.com/redis-developer/redis-vl-typescript/commit/1e30c494e3a77e2ebfbe549b0257837227523f9e))
* **vectors:** Support vectors with FLOAT16/64, BFLOAT16, INT8, UINT8 on write and query paths ([cf53235](https://github.com/redis-developer/redis-vl-typescript/commit/cf53235c45ea58dca0a9e63039ef03189f68a8e5))
* **vectors:** Support vectors with FLOAT16/64, BFLOAT16, INT8, UINT8 on write and query paths ([a74eebc](https://github.com/redis-developer/redis-vl-typescript/commit/a74eebc9261674015921201042dbb65ee24c6553))
