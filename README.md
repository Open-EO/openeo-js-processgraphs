# openeo-js-commons
A set of common JavaScript functionalities for [openEO](http://openeo.org).

**Version: 0.4.0**, supports openEO API v0.4.0.

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