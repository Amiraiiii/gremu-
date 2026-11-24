CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_ru" text NOT NULL,
	"name_uz" text NOT NULL,
	"parts_ru" text DEFAULT '' NOT NULL,
	"parts_uz" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_fitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"generation" text,
	"year_from" integer NOT NULL,
	"year_to" integer NOT NULL,
	"engine" text,
	"status" text NOT NULL,
	"verified_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"oem_number" text,
	"category_slug" text NOT NULL,
	"brand_id" uuid,
	"vehicle_make" text NOT NULL,
	"part_type" text NOT NULL,
	"title_ru" text NOT NULL,
	"title_uz" text NOT NULL,
	"description_ru" text DEFAULT '' NOT NULL,
	"description_uz" text DEFAULT '' NOT NULL,
	"price_minor" bigint NOT NULL,
	"stock_quantity" integer,
	"availability" text NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "product_fitments" ADD CONSTRAINT "product_fitments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fitments_product_idx" ON "product_fitments" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "fitments_vehicle_idx" ON "product_fitments" USING btree ("make","model");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_slug");--> statement-breakpoint
CREATE INDEX "products_oem_idx" ON "products" USING btree ("oem_number");--> statement-breakpoint
CREATE INDEX "products_published_idx" ON "products" USING btree ("is_published");