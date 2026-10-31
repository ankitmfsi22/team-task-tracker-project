# Linear MCP tools

Source: tool names exposed by the `linear` MCP server in Claude Code (session of 2026-10-31).
Read/write classification is inferred from tool names; only `list_teams`/`get_team` were actually called (read-only).
Per ASSIGNMENT Rule 17, no write tool may be used without explicit approval.

| tool | read/write | used for |
| --- | --- | --- |
| whoami | read | current authenticated user |
| get_workspace | read | workspace details |
| list_teams / get_team | read | find team (key `DEV`) |
| list_users / get_user | read | users, assignees |
| list_issues | read | search/list issues |
| get_issue | read | fetch ticket + acceptance criteria (CLAUDE.md "fetch ticket first") |
| list_issue_statuses / get_issue_status | read | workflow states |
| list_issue_labels | read | labels |
| list_comments | read | issue comments |
| list_projects / get_project | read | projects |
| list_project_labels | read | project labels |
| list_milestones / get_milestone | read | milestones |
| list_cycles | read | cycles |
| list_documents / get_document | read | documents |
| list_templates / get_template | read | issue templates |
| list_custom_views | read | saved views |
| list_releases / get_release, list_release_pipelines, list_release_notes / get_release_note | read | releases |
| get_status_updates | read | project/initiative status updates |
| get_notifications | read | notifications |
| get_attachment | read | attachment details |
| get_triage_responsibility | read | triage owners |
| extract_images | read | images in issue content |
| list_diffs / get_diff / get_diff_threads | read | diff (code review) objects |
| list_agent_skills / get_agent_skill | read | agent skills |
| search_documentation | read | Linear docs search |
| save_issue | write | create/update issues (needs approval) |
| save_comment / delete_comment | write | add/edit/delete comments |
| save_project / save_milestone / save_document | write | create/update projects, milestones, documents |
| save_issue_label / create_issue_label / retire_issue_label / restore_issue_label | write | manage issue labels |
| save_project_label / retire_project_label / restore_project_label | write | manage project labels |
| save_release / save_release_note | write | releases |
| save_status_update / delete_status_update | write | status updates |
| create_attachment / create_attachment_from_upload / prepare_attachment_upload / prepare_file_upload / delete_attachment | write | attachments/uploads |
| share_issue / unshare_issue | write | sharing issues |
| mark_notification | write | notification state |
| save_diff_comment / delete_diff_comment / resolve_diff_thread / submit_diff_review / update_diff / merge_diff | write | diff review actions |
