const FL = require('../src/featurelist.js');

var endpoints = [
  {
    "path": "/collections",
    "methods": ["GET"]
  },
  {
    "path": "/collections/{collection_id}",
    "methods": ["GET"]
  },
  {
    "path": "/processes",
    "methods": ["GET"]
  },
  {
    "path": "/jobs",
    "methods": ["POST","GET"]
  },
  {
    "path": "/jobs/{job_id}",
    "methods": ["GET","PATCH","DELETE"]
  },
  {
    "path": "/jobs/{job_id}/results",
    "methods": ["GET","POST"]
  },
  {
    "path": "/files/{user_id}",
    "methods": ["GET"]
  },
  {
    "path": "/files/{user_id}/{path}",
    "methods": ["PUT","DELETE"]
  },
  {
    "path": "/credentials/basic",
    "methods": ["GET"]
  },
  {
    "path": "/me",
    "methods": ["GET"]
  }
];
const getOutputFormats = {
  "path": "/output_formats",
  "methods": ["GET"]
};
const getFileFormats = {
  "path": "/file_formats",
  "methods": ["GET"]
};
const postPreview = {
  "path": "/preview",
  "methods": ["POST"]
};
const postResult = {
  "path": "/result",
  "methods": ["POST"]
};

var endpoints03 = endpoints.slice(0);
endpoints03.push(getOutputFormats, postPreview);
var endpoints04 = endpoints.slice(0);
endpoints04.push(getOutputFormats, postResult);
var endpoints10 = endpoints.slice(0);
endpoints10.push(getFileFormats, postResult);


var flattenedEndpoints = [
  "get /file_formats",
  "get /collections",
  "get /collections/{}",
  "get /processes"
];

var expectedReportFromFlattened = {
  "Basic functionality": 2,
  "Authenticate with HTTP Basic": 0,
  "Authenticate with OpenID Connect": 0,
  "Batch processing": 0,
  "Estimate processing costs": 0,
  "Preview processing results": 0,
  "Secondary web services": 0,
  "File storage": 0,
  "Stored process graphs": 0,
  "Validate process graphs": 0,
  "Notifications and monitoring": 0,
  "User defined functions (UDF)": 0
};

var expectedEndpointList10 = {
  "Basic functionality": [
    "get /collections",
    "get /collections/{}",
    "get /processes",
    "get /file_formats"
  ],
  "Authenticate with HTTP Basic": [
    "get /credentials/basic"
  ],
  "Authenticate with OpenID Connect": [
    "get /credentials/oidc"
  ],
  "Batch processing": [
    "get /jobs",
    "post /jobs",
    "get /jobs/{}",
    "delete /jobs/{}",
    "get /jobs/{}/logs",
    "get /jobs/{}/results",
    "post /jobs/{}/results"
  ],
  "Estimate processing costs": [
    "get /jobs/{}/estimate"
  ],
  "Preview processing results": [
    "post /result"
  ],
  "Secondary web services": [
    "get /service_types",
    "get /services",
    "post /services",
    "get /services/{}",
    "delete /services/{}",
    "get /services/{}/logs"
  ],
  "File storage": [
    "get /files/{}",
    "get /files/{}/{}",
    "put /files/{}/{}",
    "delete /files/{}/{}"
  ],
  "Stored process graphs": [
    "get /process_graphs",
    "post /process_graphs",
    "get /process_graphs/{}",
    "delete /process_graphs/{}"
  ],
  "Validate process graphs": [
    "post /validation"
  ],
  "Notifications and monitoring": [
    "get /subscription"
  ],
  "User defined functions (UDF)": [
    "get /udf_runtimes"
  ]
};

function renameEndpoints(list, changes) {
  var usecases = Object.assign({}, list);
  for(var find in changes) {
    for(var uc in usecases) {
      var endpoints = usecases[uc].slice(0);
      var index = endpoints.indexOf(find);
      if (index !== -1) {
          endpoints[index] = changes[find];
      }
      usecases[uc] = endpoints;
    }
  }
  return usecases;
}

var expectedEndpointList04 = renameEndpoints(expectedEndpointList10, {
  "get /file_formats": "get /output_formats"
});

var expectedEndpointList03 = renameEndpoints(expectedEndpointList04, {
  "post /result": "post /preview"
});

var expectedReport = {
  "Basic functionality": 2,
  "Authenticate with HTTP Basic": 2,
  "Authenticate with OpenID Connect": 0,
  "Batch processing": 1,
  "Estimate processing costs": 0,
  "Preview processing results": 2,
  "Secondary web services": 0,
  "File storage": 1,
  "Stored process graphs": 0,
  "Validate process graphs": 0,
  "Notifications and monitoring": 0,
  "User defined functions (UDF)": 0
};

describe('Basic Collection Migration Tests', () => {
  test('Basics', () => {
    expect(FL.getFeatureCount()).toBe(12);
    expect(FL.getFeatures()).toEqual(Object.keys(FL.features));
    expect(FL.endpointToString("POST", "/abc/{variable}/DEF/{}")).toBe("post /abc/{}/def/{}");
  });
  test('Get Legacy Endpoint', () => {
    expect(FL.findLegacyEndpoint("1.0.0", "post /result")).toBe("post /result");
    expect(FL.findLegacyEndpoint("0.4.0", "post /result")).toBe("post /result");
    expect(FL.findLegacyEndpoint("1.0.0", "get /file_formats")).toBe("get /file_formats");
    expect(FL.findLegacyEndpoint("0.4.0", "get /file_formats")).toBe("get /output_formats");
    expect(FL.findLegacyEndpoint("0.3.0", "get /file_formats")).toBe("get /output_formats");
    expect(FL.findLegacyEndpoint("1.0", "/file_formats", "GET")).toBe("get /file_formats");
  });
  test('Get List For Version', () => {
    expect(FL.getListForVersion("0.3.0")).toEqual(expectedEndpointList03);
    expect(FL.getListForVersion("0.4.0")).toEqual(expectedEndpointList04);
    expect(FL.getListForVersion("0.4.2")).toEqual(expectedEndpointList04);
    expect(FL.getListForVersion("1.0.0")).toEqual(expectedEndpointList10);
  });
  test('Get Report', () => {
    var report03 = FL.getReport(endpoints03, "0.3.1");
    var report04 = FL.getReport(endpoints04, "0.4.0");
    var report10 = FL.getReport(endpoints10, "1.0.0");
    var reportFlattened = FL.getReport(flattenedEndpoints, "1.0.0", false);
    expect(report03.count).toBe(3);
    expect(report04.count).toBe(3);
    expect(report10.count).toBe(3);
    expect(reportFlattened.count).toBe(1);
    expect(report03.list).toEqual(expectedReport);
    expect(report04.list).toEqual(expectedReport);
    expect(report10.list).toEqual(expectedReport);
    expect(reportFlattened.list).toEqual(expectedReportFromFlattened);
  });
});