# Local security boundary

The development servers bind only to 127.0.0.1. Vite proxies API requests; there is
no wildcard CORS. Browser POST origins are restricted to HTTP localhost/127.0.0.1
on development port 5173 or production-preview port 5174, plus 127.0.0.1:8000 for
the API itself. Other ports, suffixes and origins are rejected.
Track/vehicle/setup values are validated; requests over
1.5 MB are rejected. Track IDs are catalog lookups, never filesystem paths.

Track and vehicle data are treated as data, never instructions or executable source. Names and
provenance render as escaped React text. Imports cannot read other local files.
Exports are downloaded on the user's device, and storage is explicit and local.
The npm/Python dependency graph is pinned for reproducibility.
Editable vehicle JSON rejects unknown properties and numeric strings, bounds
numeric inputs and array lengths, and accepts only HTTP(S) provenance links.
Standalone files are capped at 256,000 bytes; inline API requests retain the shared
1.5 MB limit. Profile imports never write the server catalog. Source statements and
synthetic flags are unverified declarations; validation does not authenticate them.

The local service has no authentication, tenant isolation, compute quotas or
persistent database. Do not expose it to a public network as a production service.
The request size check is not a streaming gateway. A production design must add
appropriate authentication, resource/time limits, deployment origins and logging.
