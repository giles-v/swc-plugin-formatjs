# swc-plugin-formatjs

An experimental plugin for [swc](https://swc.rs) which implements ID overrides for formatjs messages during transformations.

This plugin is very much not general-purpose; it implements a small subset of [@formatjs/ts-transformer](https://formatjs.io/docs/tooling/ts-transformer/) which was relevant to what I needed to do. It uses a fixed id hashing algorithm.
