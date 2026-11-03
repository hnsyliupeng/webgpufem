# Vendored DAVE model assets

`Snake15.dave`, `100x30x8_barge.dave`, `cube.obj`, `barge.obj` are copied verbatim from the public
DAVE repository (github.com/RubendeBruin/DAVE, `src/DAVE/resources/`), which is
licensed under the Mozilla Public License 2.0 — see `DAVE-LICENSE-MPL2.txt`.
They are used here as *import fixtures* for the clean-room `.dave` importer
(`core/dave_import.js`, examples ex22/ex23): the files are executed as data, and no
DAVE binary is decompiled or linked. The companion `*.dave.js` modules are mechanical
`export default <json-stringified text>` wrappers so the browser app can import the
same text without fetch.
