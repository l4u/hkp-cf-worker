# Hongkong Post Label Downloader

The connection from overseas to the Hongkong Post API is slow. The Hongkong Post
API returns the PDF data of labels as a base64 encoded string in a JSON object.

Cloudflare Workers is used to fetch the labels, which improves the
download speed. With base64 decoding, the processed PDF can be viewed directly
from a browser.

Workers KV is used to cache the PDF data, so the label can be redownloaded
without sending another request to the Hongkong Post API. While the KV
arrayBuffer works, the KV stream should work better.

The API credentials are stored as secrets via wrangler secret.

Based on a small sample usage, the median CPU time is 1.2ms.

## Paths

https://${worker_host}/labels/${item_number}/download
