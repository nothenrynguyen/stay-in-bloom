ALTER TABLE flowers
ADD COLUMN status text NOT NULL DEFAULT 'pending';

ALTER TABLE flowers
ADD COLUMN notified boolean NOT NULL DEFAULT false;
