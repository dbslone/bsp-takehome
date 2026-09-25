# Brief flow

How a brief moves from the add dialog through storage, analysis, and the brief page. The dialog posts the form to `POST /api/briefs`. The brief is stored and a pending analysis is queued before the response returns. The brief page polls until that run finishes.

```mermaid
flowchart TD
  dialog[Add brief dialog]
  validClient{Fields valid?}
  post["POST /api/briefs"]
  validServer{File and fields valid?}
  rejected[400 with an error message]
  stored[Brief row in Postgres]
  pending[Pending analysis row]
  returned[201 returned immediately]
  page[Brief page polls every 3 seconds]
  attached{File attached?}
  readFile["PDF, DOCX, or plain text"]
  formOnly["Form text only. Extracted fields stay empty"]
  model[OpenRouter]
  matches{JSON matches schema?}
  filled[Blank fields filled and result stored]
  failed[Analysis saved as error]
  rendered["Themes, audience, strengths, risks, and next actions"]

  dialog --> validClient
  validClient -->|no| dialog
  validClient -->|yes| post
  post --> validServer
  validServer -->|no| rejected
  validServer -->|yes| stored
  stored --> pending
  pending --> returned
  pending --> attached
  returned --> page
  attached -->|yes| readFile
  attached -->|no| formOnly
  readFile --> model
  formOnly --> model
  model --> matches
  matches -->|yes| filled
  matches -->|no| failed
  filled --> page
  failed --> page
  page --> rendered
```

Title is always required. A file is optional. With a file, the other fields may be blank and analysis can fill them. Without a file, description, content type, and target audience are required, notes stay optional, and the model is asked to leave extracted fields empty. Failures at each step are listed in [edge-cases.md](edge-cases.md).
