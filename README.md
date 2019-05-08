# openeo-js-commons
A set of common JavaScript functionalities for [openEO](http://openeo.org).

**Version: 0.4.0-beta.1**, supports openEO API v0.4.0.

## Features
- Converting responses to the latest API version is supported for:
  - Capabilities
  - Collections
  - Processes
  - Output Formats
  - Service Types
- Feature detection
- Process graph handling:
  - Parsing a process graph
  - Validation based on the JSON Schemas
  - Framework to implement process graph execution
- JSON Schema validation for Process parameters and return values

## Usage

To use it in a node environment use: `npm install @openeo/js-commons`

You can then require the parts of the library you want to use. For example: `const { FeatureList } = require('@openeo/js-commons');`

In a web environment you can include the library as follows:

```
<script src="https://cdn.jsdelivr.net/npm/@openeo/js-commons@0.4.0/dist/main.min.js"></script>
```

This library has a peer dependency to `ajv`, so if you'd like to use process graph validation or execution you need to include `ajv` (v6.10) in your package.json or include it in your web page:

```
<script src="https://cdn.jsdelivr.net/npm/ajv@6.10.0/lib/ajv.min.js"></script>
```