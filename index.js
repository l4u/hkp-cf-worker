import { Router } from 'itty-router'

const router = Router()

// https://gist.github.com/shagamemnon/3ad07f1b2edbbd2f690bf96e87b44786
function fromBinary(msg) {
  const ui = new Uint8Array(msg.length)
  for (let i = 0; i < msg.length; ++i) {
    ui[i] = msg.charCodeAt(i)
  }
  return ui
}

router.get('/labels/:id/download', async ({ params }) => {
  // return a cached version from KV if it is available
  // stream or arrayBuffer both work
  let kvstream = await LABELKV.get(params.id, { type: "stream" })

  if (kvstream) {
    console.log('serve from KV')
    let { readable, writable } = new TransformStream()
    kvstream.pipeTo(writable)

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  }

  let headers = new Headers();
  headers.set('Authorization', `Basic ${btoa(API_USER + ":" + API_KEY)}`);
  headers.set('hkpId', HKPID);

  const hkpUrl = new URL(`${API_HOST}/posting/order/addressPack`)
  hkpUrl.searchParams.set("itemNo", params.id)

  let hkpResponse = await fetch(hkpUrl, {
    headers: headers
  })

  const hkpJson = await hkpResponse.json();

  // parse the JSON response, base64 decode (with unicode) the ap field, and return the binary PDF file
  if (hkpJson.data && hkpJson.data.ap) {
    let binaryData = fromBinary(atob(hkpJson.data.ap))
    await LABELKV.put(params.id, binaryData, { expirationTtl: 60 * 60 * 24 }) // 24 hour
    return new Response(binaryData, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  }

  // return an error if there is a error message from HKP
  if (hkpJson.error && hkpJson.error.message) {
    const json = JSON.stringify({ error: hkpJson.error.message });
    return new Response(json, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // return an error if there are other errors
  const json = JSON.stringify({ error: "Unhandled error" });
  return new Response(json, {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });

})

router.all("*", () => new Response("404, not found!", { status: 404 }))

addEventListener('fetch', (e) => {
  e.respondWith(router.handle(e.request))
})
