const Utils = require('../utils.js');

var MigrateCapabilities = {

    guessApiVersion(capabilities) {
        if (typeof capabilities.api_version === 'string') {
			return capabilities.api_version;
		}
		else if (typeof capabilities.version === 'string') {
			return capabilities.version;
		}
        // Now we are really guessing
		else if (Array.isArray(capabilities.endpoints) && capabilities.endpoints.filter(e => e.path === '/output_formats').length > 0) {
			return "0.4";
		}
		else if (!capabilities.backend_version && !capabilities.title && !capabilities.description && !capabilities.links) {
			return "0.3";
		}
		else { // Latest version
			return "1.0";
		}
    },

    // Always returns a copy of the input object
    convertCapabilitiesToLatestSpec(originalCapabilities, version = null, updateVersionNumber = true, title = "Unknown", backend_version = "Unknown") {
        var capabilities = Object.assign({}, originalCapabilities);
        if (version === null) {
            version = this.guessApiVersion(capabilities);
        }
        // convert v0.3 capabilities to v0.4 format
        if (Utils.compareVersion(version, "0.3.x") === 0) {
            // version => api_version
            if (typeof capabilities.version !== 'undefined') {
                delete capabilities.version;
            }
        }

        // Convert billing plans
        if (Utils.isObject(capabilities.billing)) {
            capabilities.billing = this.convertBillingToLatestSpec(capabilities.billing, version);
        }
        else {
            delete capabilities.billing;
        }

        // Convert endpoints
        capabilities.endpoints = this.convertEndpointsToLatestSpec(capabilities.endpoints, version);

        // Add missing fields with somewhat useful data
        if (updateVersionNumber || typeof capabilities.api_version !== 'string') {
            capabilities.api_version = "1.0.0";
        }
        if (typeof capabilities.backend_version !== 'string') {
            capabilities.backend_version = backend_version;
        }
        if (typeof capabilities.title !== 'string') {
            capabilities.title = title;
        }
        if (typeof capabilities.description !== 'string') {
            capabilities.description = "";
        }
        if (!Array.isArray(capabilities.links)) {
            capabilities.links = [];
        }

        return capabilities;
    },

    // Always returns a copy of the input object
    convertBillingToLatestSpec(originalBilling, version) {
        var billing = Object.assign({}, originalBilling);
        // convert v0.3 billing info to v0.4 format
        if (Utils.compareVersion(version, "0.3.x") === 0) {
            // Add paid flag to billing plans
            if (Array.isArray(billing.plans)) {
                billing.plans = billing.plans.map(plan => {
                    if (typeof plan.paid !== 'boolean') {
                        plan.paid = true;
                        if (typeof plan.name === 'string' && plan.name.toLowerCase().includes('free')) {
                            plan.paid = false;
                        }
                    }
                    return plan;
                });
            }
        }

        return billing;
    },

    // Always returns a copy of the input object
    convertEndpointsToLatestSpec(originalEndpoints, version) {
        var endpoints = [];
        if (Array.isArray(originalEndpoints)) {
            endpoints = originalEndpoints.slice(0);
        }
        // convert v0.3 service types to v0.4 format
        if (Utils.compareVersion(version, "0.3.x") === 0) {
            // Nothing to do as nothing has changed.
        }
        return endpoints;
    },

    // Alias for convertFileFormatsToLatestSpec
    convertOutputFormatsToLatestSpec(originalFormats, version) {
        return this.convertFileFormatsToLatestSpec(originalFormats, version);
    },

    // Always returns a copy of the input object
    convertFileFormatsToLatestSpec(originalFormats, version) {
        var formats = Object.assign({}, originalFormats);

        if (Utils.compareVersion(version, "0.3.x") === 0 && Utils.isObject(formats.formats)) {
            formats = formats.formats;
        }

        if (Utils.compareVersion(version, "0.4.x") <= 0 && Utils.isObject(formats)) {
            formats = {
                output: formats
            };
        }

        if (!Utils.isObject(formats.input)) {
            formats.input = {};
        }
        if (!Utils.isObject(formats.output)) {
            formats.output = {};
        }

        return formats;
    },

    // Always returns a copy of the input object
    convertServiceTypesToLatestSpec(originalTypes, version) {
        var types = Object.assign({}, originalTypes);
        // Nothing to do as nothing has changed in 0.3 and 0.4.
        if (Utils.compareVersion(version, "0.4.x") > 0) {
            // Add future changes here.
        }
        return types;
    },

    // Always returns a copy of the input object
    convertUdfRuntimesToLatestSpec(originalRuntimes, version) {
        var runtimes = Object.assign({}, originalRuntimes);
        // Nothing to do, was not supported in 0.3 and nothing changed in 0.4.
        if (Utils.compareVersion(version, "0.4.x") > 0) {
            // Add future changes here.
        }
        return runtimes;
    }

};

module.exports = MigrateCapabilities;