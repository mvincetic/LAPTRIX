# Local security boundary

The development servers bind only to 127.0.0.1. Vite proxies API requests; there is
no wildcard CORS. Browser POST origins outside the fixed local development origins
are rejected by the API. Track/vehicle/setup values are validated; requests over
1.5 MB are rejected. Track IDs are catalog lookups, never filesystem paths.

Track data is treated as data, never instructions or executable source. Names and
provenance render as escaped React text. Imports cannot read other local files.
Exports are downloaded on the user's device, and storage is explicit and local.
The npm/Python dependency graph is pinned for reproducibility.

The local service has no authentication, tenant isolation, compute quotas or
persistent database. Do not expose it to a public network as a production service.
The request size check is not a streaming gateway. A production design must add
appropriate authentication, resource/time limits, deployment origins and logging.
