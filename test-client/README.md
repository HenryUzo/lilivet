# Lili Vet API Tester

This is a static dummy frontend for exercising the public backend flows:

- appointment draft create/save/upload/submit
- new patient request submit

It is intentionally plain HTML and vanilla JavaScript.

## How to use

Open [index.html](C:\Websites\Lilivet\backend\test-client\index.html) in a browser.

If your browser blocks `file://` fetches, serve the folder over a local static server instead. Any static server is fine. Example with Node:

```bash
npx serve C:\Websites\Lilivet\backend\test-client
```

Then open the local URL shown by the server.

## Defaults

- API base URL defaults to `https://lilivet.onrender.com`
- Timezone defaults to `America/Chicago`

## Step 4 model

The appointment tester follows the current Weave-style backend payload:

```json
{
  "preferredSlots": [
    "2026-05-05T14:00:00.000-05:00",
    "2026-05-06T10:30:00.000-05:00"
  ],
  "timezone": "America/Chicago"
}
```

The Step 4 tester UI now mirrors the Weave interaction more closely:

- week range picker with previous/next week navigation
- month popover for jumping to another week
- day availability cards across the selected week
- time-slot buttons with a 3-slot selection limit
