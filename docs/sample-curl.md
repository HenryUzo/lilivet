# Sample curl Requests

Set the API base URL:

```bash
BASE_URL=http://localhost:4000
```

Create a draft:

```bash
curl -X POST "$BASE_URL/api/appointment-drafts"
```

Autosave appointment steps:

```bash
curl -X PATCH "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/step-1" \
  -H "Content-Type: application/json" \
  -d '{"visitType":"WELLNESS_EXAM"}'

curl -X PATCH "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/step-2" \
  -H "Content-Type: application/json" \
  -d '{"petName":"Milo","species":"DOG","breed":"Mixed breed","approximateAgeYears":4,"sex":"MALE","weightLbs":38.5}'

curl -X PATCH "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/step-3" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Amara","lastName":"Okafor","email":"amara.okafor@example.com","phoneNumber":"+2348012345678","preferredContactMethod":"CALL"}'

curl -X PATCH "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/step-4" \
  -H "Content-Type: application/json" \
-d '{"preferredSelections":[{"date":"2026-05-04T00:00:00.000Z","timeSlots":["20:30"]},{"date":"2026-05-05T00:00:00.000Z","timeSlots":["16:15"]},{"date":"2026-05-07T00:00:00.000Z","timeSlots":["18:30"]}],"timezone":"Africa/Lagos"}'

curl -X PATCH "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/step-5" \
  -H "Content-Type: application/json" \
  -d '{"symptomsOrConcerns":"Annual wellness check.","currentMedications":"None","previousVeterinarian":"Greenfields Vet Clinic","symptomDuration":"Not applicable"}'
```

Upload draft medical records:

```bash
curl -X POST "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/files" \
  -F "files=@./record.pdf"
```

Submit the draft as a pending request:

```bash
curl -X POST "$BASE_URL/api/appointment-drafts/$SESSION_TOKEN/submit"
```

Create unattached files for a new-patient request:

```bash
curl -X POST "$BASE_URL/api/files" \
  -F "files=@./record.png"
```

Create a standalone new-patient request:

```bash
curl -X POST "$BASE_URL/api/new-patient-requests" \
  -H "Content-Type: application/json" \
  -d '{
    "owner": {
      "fullName": "Daniel Mensah",
      "email": "daniel.mensah@example.com",
      "phoneNumber": "+2348098765432"
    },
    "visit": {
      "reasonForVisit": "New puppy wellness exam and vaccination schedule.",
      "isUrgent": false,
      "preferredDateTime": "2026-05-07T14:00:00.000Z",
      "timezone": "Africa/Lagos",
      "previousVetClinic": "None",
      "consentToElectronicComms": true
    },
    "pet": {
      "petName": "Luna",
      "species": "DOG",
      "breed": "Golden Retriever",
      "age": "12 weeks",
      "sex": "FEMALE",
      "weightLbs": 15.2,
      "spayedNeutered": false,
      "currentMedications": "None",
      "existingConditions": "None known"
    },
    "uploadedFileIds": []
  }'
```

Update appointment status after clinic review:

```bash
curl -X PATCH "$BASE_URL/api/appointment-requests/$REQUEST_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'
```
