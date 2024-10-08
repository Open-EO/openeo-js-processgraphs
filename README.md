# openeo-js-processgraphs

[openEO](http://openeo.org) process graph parser for JavaScript.

[![Build Status](https://travis-ci.org/Open-EO/openeo-js-processgraphs.svg?branch=master)](https://travis-ci.org/Open-EO/openeo-js-processgraphs)

This library's version is **1.4.1** and supports **openEO API version 1.x**.

This repository was split apart from [openeo-js-commons](https://github.com/Open-EO/openeo-js-commons). Old releases can be found there.

## Features

- Parsing a process graph
- Validation based on the JSON Schemas
- Framework to implement process graph execution
- JSON Schema validation for Process parameters and return values

## Usage

To use it in a node environment use: `npm install @openeo/js-processgraphs`

You can then require the parts of the library you want to use. For example: `const { ErrorList } = require('@openeo/js-processgraphs');`

In a web environment you can include the library as follows:

```html
<script src="https://cdn.jsdelivr.net/npm/ajv@6/dist/ajv.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@openeo/js-processgraphs@1/dist/main.min.js"></script>
```

More information can be found in the [**documentation**](https://open-eo.github.io/openeo-js-processgraphs/1.4.1/).
