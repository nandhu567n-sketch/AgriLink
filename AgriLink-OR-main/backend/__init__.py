"""Backend package: FastAPI application, database access and the decision services.

The backend owns *all* data access. Nothing under `src/` reads a file or a database --
those modules stay pure functions over plain DataFrames. The frontend owns *no* data
access at all; it calls the HTTP API exposed here.
"""
__version__ = "2.0.0"
