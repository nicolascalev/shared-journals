import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "updates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"member_id" integer NOT NULL,
  	"posted_at" timestamp(3) with time zone NOT NULL,
  	"text" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "updates_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "updates_id" integer;
  ALTER TABLE "updates" ADD CONSTRAINT "updates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "updates" ADD CONSTRAINT "updates_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "updates_rels" ADD CONSTRAINT "updates_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."updates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "updates_rels" ADD CONSTRAINT "updates_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "updates_event_idx" ON "updates" USING btree ("event_id");
  CREATE INDEX "updates_member_idx" ON "updates" USING btree ("member_id");
  CREATE INDEX "updates_updated_at_idx" ON "updates" USING btree ("updated_at");
  CREATE INDEX "updates_created_at_idx" ON "updates" USING btree ("created_at");
  CREATE INDEX "updates_rels_order_idx" ON "updates_rels" USING btree ("order");
  CREATE INDEX "updates_rels_parent_idx" ON "updates_rels" USING btree ("parent_id");
  CREATE INDEX "updates_rels_path_idx" ON "updates_rels" USING btree ("path");
  CREATE INDEX "updates_rels_media_id_idx" ON "updates_rels" USING btree ("media_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_updates_fk" FOREIGN KEY ("updates_id") REFERENCES "public"."updates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_updates_id_idx" ON "payload_locked_documents_rels" USING btree ("updates_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "updates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "updates_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "updates" CASCADE;
  DROP TABLE "updates_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_updates_fk";
  
  DROP INDEX "payload_locked_documents_rels_updates_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "updates_id";`)
}
