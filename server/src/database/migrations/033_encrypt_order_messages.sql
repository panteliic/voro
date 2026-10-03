ALTER TABLE order_message ADD COLUMN body_encrypted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE order_message DROP CONSTRAINT order_message_body_check;
ALTER TABLE order_message ADD CONSTRAINT order_message_body_check
  CHECK (char_length(body) BETWEEN 1 AND CASE WHEN body_encrypted THEN 6000 ELSE 1000 END);

UPDATE app_notification SET body = 'Open the conversation to read your new message.'
WHERE type = 'new_message';
