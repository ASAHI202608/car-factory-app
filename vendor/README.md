# vendor

外部ライブラリ。オフライン（PWA）で動かすため、CDNではなく同梱している。

- `three.module.js` … Three.js r160（MIT License, Copyright 2010-2023 Three.js Authors）
- `RoomEnvironment.js` … Three.js examples（同上）
- `OrbitControls.js` … Three.js examples（同上）

`from 'three'` の解決には importmap を使う（3d-検証.html 参照）。
