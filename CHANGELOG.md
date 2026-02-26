# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.2] - 2026-02-26

### Fixed

- Fix validation error when process had no return value schema

## [1.4.1] - 2024-08-12

### Changed

- Updated openeo-js-commons

## [1.4.0] - 2024-08-12

### Changed

- The compatibility check for schemas is more liberal
- Updated dev dependencies

## [1.3.0] - 2021-08-12

### Added

- Implemented process namespace support.

### Changed

- Improved clarity of error messages.
- `BaseProcess` class doesn't expose process properties via (non-public) `spec` property any longer.

### Deprecated

- `ProcessRegistry` has been deprecated. Use the `ProcessRegistry` from `@openeo/js-commons` (since v1.4.0) instead.

## [1.2.1] - 2021-08-02

### Fixed

- Always allow empty process graphs if option is set

## [1.2.0] - 2021-07-05

### Added

- `ProcessGraph.getProcessParameter(s)` can return undefined parameters if the `includeUndefined` parameter is set to `true`

## [1.1.0] - 2021-06-29

### Added

- Better support for unknown subtypes
- Implement full support of openEO API v1.1.0

### Fixed

- Fixed recursion issue with unknown subtypes

## [1.0.0] - 2021-02-15

First stable release supporting openEO API 1.0.0.

## Prior releases

All prior releases have been documented in the [GitHub Releases](https://github.com/Open-EO/openeo-js-processgraphs/releases).

[Unreleased]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.4.0...HEAD>
[1.4.0]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.3.0...v1.4.0>
[1.3.0]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.2.1...v1.3.0>
[1.2.1]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.2.0...v1.2.1>
[1.2.0]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.1.0...v1.2.0>
[1.1.0]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.0.0...v1.1.0>
[1.0.0]: <https://github.com/Open-EO/openeo-js-processgraphs/compare/v1.0.0>
