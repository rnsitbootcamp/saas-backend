#!/usr/bin/python3

"""
This example shows two ways to redirect flows to another server.
"""
from mitmproxy import http


def request(flow: http.HTTPFlow) -> None:
    # pretty_host takes the "Host" header of the request into account,
    # which is useful in transparent mode where we usually only have the IP
    # otherwise.
    print("sdsd", flow.request)
    if flow.request.pretty_host == "35.165.101.224":
        flow.request.host = "localhost"
