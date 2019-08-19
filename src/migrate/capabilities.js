const Utils = require('../utils.js');

var MigrateCapabilities = {

    guessApiVersion(capabilties) {
		if (typeof capabilties.version === 'string') {
			return capabilties.version;
		}
		else if (typeof capabilties.api_version === 'string') {
			return capabilties.api_version;
		}
		else if (capabilties.backend_version || capabilties.title || capabilties.description || capabilties.links) {
			return "0.4";
		}
		else {
			// This is a wild guess
			return "0.3";
		}
    },

    // Always returns a copy of the input object
    convertCapabilitiesToLatestSpec(originalCapabilities, version = null, title = "Unknown") {
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
        if (typeof capabilities.billing !== 'undefined') {
            capabilities.billing = this.convertBillingToLatestSpec(capabilities.billing, version);
        }
        // Convert endpoints
        capabilities.endpoints = this.convertEndpointsToLatestSpec(capabilities.endpoints, version);

        // Add missing fields with somewhat useful data
        if (typeof capabilities.api_version !== 'string') {
            capabilities.api_version = "0.4.2";
        }
        if (typeof capabilities.backend_version !== 'string') {
            capabilities.backend_version = "Unknown";
        }
        if (typeof capabilities.title !== 'string') {
            capabilities.title = title;
        }
        if (typeof capabilities.description !== 'string') {
            capabilities.description = "No description provided.";
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

    // Always returns a copy of the input object
    convertOutputFormatsToLatestSpec(originalFormats, version) {
        var formats = Object.assign({}, originalFormats);
        // convert v0.3 output formats to v0.4 format
        if (Utils.compareVersion(version, "0.3.x") === 0) {
            if (typeof formats.formats === 'object' && formats.formats !== null) {
                return formats.formats;
            }
        }
        return formats;
    },

    // Always returns a copy of the input object
    convertServiceTypesToLatestSpec(originalTypes, version) {
        var types = Object.assign({}, originalTypes);
        // convert v0.3 service types to v0.4 format
        if (Utils.compareVersion(version, "0.3.x") === 0) {
            // Nothing to do as nothing has changed.
        }
        return types;
    },

    // Always returns a copy of the input object
    convertUdfRuntimesToLatestSpec(originalRuntimes, version) {
        var runtimes = Object.assign({}, originalRuntimes);
        // Not supported in v0.3, nothing to change
        return runtimes;
    }

};

module.exports = MigrateCapabilities;