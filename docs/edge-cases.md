# Edge cases

How the app behaves when a request, upload, analysis, or screen does not follow the happy path. API failures use `{ "error": "..." }` and an HTTP status. Analysis failures are saved on the analysis row so the brief page can show them.

## Uploads and form fields

Create and update both require the file checks below. Text fields are optional. Blank title, description, content type, audience, and notes are allowed and can be filled from the file after analysis.

| Case                                             | Response                                               |
| ------------------------------------------------ | ------------------------------------------------------ |
| No file on create                                | `400` `A file is required`                             |
| Extension other than `.pdf`, `.docx`, or `.txt`  | `400` `Upload must be a PDF, DOCX, or plain text file` |
| Empty file                                       | `400` `File is empty`                                  |
| `.pdf` whose first 1 KB does not contain `%PDF-` | `400` `File content is not a PDF`                      |
| `.docx` that is not a zip (`PK` header)          | `400` `File content is not a DOCX document`            |
| `.txt` that contains a null byte                 | `400` `Text file contains binary data`                 |
| Larger than 10 MB                                | `400` `File must be 10 MB or smaller`                  |
| Other multer rejection                           | `400` `Invalid upload`                                 |
| A field is not a string                          | `400` `{Label} must be text`                           |
| Title or content type over 255 characters        | `400` with the field name and limit                    |
| Description or notes over 10,000 characters      | `400` with the field name and limit                    |

The add-brief dialog checks extension, empty file, and the 10 MB limit as soon as a file is chosen or dropped, and again on submit. The server repeats those checks and also inspects the bytes.

A file that passes these checks can still fail later. A damaged `.docx` becomes an analysis error: `Could not read text from the uploaded file`.

## HTTP

| Case                                 | Response                          |
| ------------------------------------ | --------------------------------- |
| Unknown brief or file id             | `404` `Not found`                 |
| Unknown `/api/*` path                | `404` `Not found`                 |
| Malformed JSON body                  | `400` `Invalid JSON`              |
| JSON body over the parser limit      | `413` `Request body is too large` |
| Database or other unexpected failure | `500` `Something went wrong`      |
| Database down on `GET /api/health`   | `503` `{ "status": "error" }`     |

The `500` body does not include the stack or the database message. Those are logged on the server. Invalid ids are treated as missing rather than as query errors.

An idle Postgres client can emit an error after the server has returned the connection to the pool. The pool logs that error and keeps running.

`PORT` must be an integer from 1 to 65535. The default is `3001`. A bad value stops the process before it listens. A missing `DATABASE_URL` also stops startup.

## Creating and editing a brief

Saving the brief and starting analysis are separate. If the brief is stored but analysis cannot be queued, create still returns `201` and update still returns `200`. The JSON includes `analysisError: "Could not start analysis"`. The home page shows: `Brief saved, but analysis could not start. Could not start analysis`.

If a pending analysis already exists when the queue insert races, the save still succeeds and no warning is added. The in-progress analysis is left as the current one.

Editing a brief (any text field or a replacement file) supersedes a pending analysis. The old row is marked `error` with `Superseded by a newer analysis`, its model call is aborted, and a new pending row is inserted. A partial unique index on `brief_analyses (brief_id) WHERE status = 'pending'` allows only one pending row per brief. The migration marks older duplicate pending rows as superseded before creating that index.

Two app processes can start at once. Migrations take a Postgres advisory lock, apply each file in a transaction, and roll that file back if it fails. The second process waits, then sees the migration as already applied.

## Analysis

`POST /api/briefs/:id/analysis` starts a run and returns `202` with the pending row. The model call continues after the response.

| Case                                                   | What the user sees                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Another analysis is already pending                    | `409` `An analysis is already in progress`. The panel reloads instead of showing an error. |
| Brief deleted between the check and the insert         | `404` `Not found`                                                                          |
| `OPENROUTER_API_KEY` is unset                          | Analysis `error`: `OPENROUTER_API_KEY is not set on the server`                            |
| OpenRouter does not respond within 90 seconds          | Analysis `error` naming the timeout                                                        |
| OpenRouter cannot be reached, or returns an HTTP error | Analysis `error` with the status or `Could not reach OpenRouter`                           |
| Empty model content                                    | Analysis `error`: `The model returned an empty response`, or the upstream message          |
| Model text is not JSON                                 | Analysis `error`: `The model did not return valid JSON`. Fenced JSON is unwrapped first.   |
| JSON does not match the schema                         | Analysis `error` listing up to three field problems                                        |
| Brief or file disappears mid-run                       | Analysis `error`: `The brief or its file no longer exists`                                 |
| Any other throw                                        | Analysis `error`: `Unexpected error while analyzing the brief`                             |

Completion and failure updates only apply while the row is still `pending`. A superseded or deleted run cannot overwrite a newer result. If saving the failure itself fails, the server logs it and leaves the row pending until the next restart.

On startup, every row still `pending` is marked `error` with `Interrupted by server restart`.

Deleting a brief aborts its in-flight model call, then deletes the brief. Analyses are removed by the foreign key. Leaving the brief page does not cancel the run. The client only waits for the `202`, and the result is there when the user comes back.

### Filling blank fields

A successful analysis writes extracted title, description, content type, audience, and notes only into columns that are still blank at update time. A value the user already saved is left alone, including when they edit the brief while the model call is in flight. Extracted text is trimmed, then clipped to the form's length limits, before it is written. Target audience has no length limit. `updated_at` changes only when a blank field is actually filled.

## Screens

The shared API client times out after 60 seconds. A timeout is shown as `The request timed out` where the screen reads the server message. Other screens use a short fixed sentence.

| Screen        | Failure                                                 | Recovery                                                                                   |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Home          | List request fails, or the body is not a list of briefs | `Could not load briefs`, with Retry and Add brief                                          |
| Home          | Create saved the brief but analysis did not start       | Warning alert, and the new brief is in the list                                            |
| Brief         | Load fails with anything other than `404`               | `Could not load brief`, with Retry and a link home                                         |
| Brief         | `404`                                                   | `Brief not found`                                                                          |
| Brief         | Refresh after analysis fails                            | The brief stays on screen, with `Could not refresh brief details` and Retry                |
| Analysis      | First load fails                                        | `Could not load the analysis`, with Retry                                                  |
| Analysis      | A poll fails while a run is pending                     | `Could not refresh the analysis. Retrying…`, and polling continues every 3 seconds         |
| Analysis      | Run finishes as `error`                                 | `Analysis failed: …`, and the previous successful result stays visible                     |
| Analysis      | Start fails                                             | The server `error` string, or `Could not start the analysis`                               |
| File download | The file request fails                                  | `Could not download the file` on the brief page. The browser does not navigate away.       |
| Header status | Health is down, not `200`, or `status` is not `"ok"`    | `Unreachable`. Click the button to check again.                                            |
| Any route     | A render throws                                         | `This page could not be displayed`, with a link home. The layout stays when a page throws. |

Stale responses are dropped. Home and the analysis panel abort the previous request when a newer one starts. The brief page ignores a response that belongs to an id the user has already left. Unknown analysis status, risk severity, risk kind, and next-action priority render with a neutral label instead of crashing.

The status button treats only `{ "status": "ok" }` as healthy. A `200` with another body is `Unreachable`.
