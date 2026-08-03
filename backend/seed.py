"""Seed demo content into MongoDB. Idempotent."""
import os
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth import hash_password  # noqa: E402
from models import SiteContent, Service, ServicePackage, ServiceFAQ, GalleryItem, Testimonial, FAQ, BlogPost, Availability  # noqa: E402


def iso(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def doc_from_model(m):
    d = m.model_dump()
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
        elif isinstance(v, list):
            d[k] = [
                {kk: (vv.isoformat() if isinstance(vv, datetime) else vv) for kk, vv in item.items()}
                if isinstance(item, dict) else item
                for item in v
            ]
    return d


async def seed():
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # ---- Admin user ----
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@swelldesignla.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "swell2025")
    admin_name = os.environ.get("ADMIN_NAME", "Swell Admin")
    existing_admin = await db.admin_users.find_one({"email": admin_email}, {"_id": 0})
    if not existing_admin:
        await db.admin_users.insert_one({
            "id": "admin_root",
            "email": admin_email,
            "name": admin_name,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        print(f"Seeded admin user: {admin_email}")
    else:
        # Reset password to env-configured value so admins can always log in
        await db.admin_users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "name": admin_name}},
        )
        print(f"Admin user exists; password refreshed for {admin_email}")

    # ---- Site content ----
    if not await db.site_content.find_one({"id": "site_content_singleton"}, {"_id": 0}):
        sc = SiteContent()
        await db.site_content.insert_one(doc_from_model(sc))
        print("Seeded site content")

    # ---- Availability ----
    if not await db.availability.find_one({"id": "availability_singleton"}, {"_id": 0}):
        av = Availability()
        await db.availability.insert_one(doc_from_model(av))
        print("Seeded availability")

    # ---- Services ----
    if await db.services.count_documents({}) == 0:
        services = [
            Service(
                slug="balloon-installations",
                title="Custom Balloon Installations",
                subtitle="Organic garlands, arches, ceilings & sculptural moments.",
                short_description="Statement balloon installations designed around your color story, venue, and vibe.",
                description="From lush organic garlands to soaring arches and dreamy ceiling clouds — every install is hand-designed, hand-built, and installed on-site by our team. We'll help you choose a palette, scale it to your space, and make it feel effortless.",
                price_from="$450+",
                hero_image_url="https://images.unsplash.com/photo-1758738181955-3f917d756275?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                images=[
                    "https://images.unsplash.com/photo-1758870041148-31d28fdf34d9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                    "https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                ],
                features=["On-site install & takedown", "Custom color matching", "Organic + classic styles", "Compatible with florals + signage"],
                packages=[
                    ServicePackage(name="Petite garland", price_from="$450", description="6-8 ft accent garland — perfect for dessert tables or small backdrops.", features=["Custom palette", "Delivery + install", "Takedown available"]),
                    ServicePackage(name="Statement install", price_from="$950", description="12-18 ft organic install with mixed textures and premium accents.", features=["Full design consult", "Delivery + install", "Optional florals"]),
                    ServicePackage(name="Full event", price_from="$2,400", description="Multi-piece install — arches, ceilings, and photo moments.", features=["Full-service styling", "On-site team", "Complimentary sign design"]),
                ],
                faqs=[
                    ServiceFAQ(question="How far in advance should we book?", answer="For weekends and holiday weekends, 4-8 weeks is ideal. We do accept last-minute inquiries when availability allows."),
                    ServiceFAQ(question="Do you match specific colors?", answer="Yes — send us a swatch, invitation, or Pinterest board and we'll build a palette to match."),
                ],
                related_slugs=["weddings", "birthday-parties"],
                seo_title="Custom Balloon Installations in Los Angeles | swell design + media",
                seo_description="Organic balloon garlands, arches, and installations custom-designed for weddings, showers, birthdays, and corporate events in LA.",
                order=1,
            ),
            Service(
                slug="weddings",
                title="Weddings",
                subtitle="Ceremony arches, reception backdrops, and thoughtful details.",
                short_description="Full-service decor styling for LA weddings — from micro to grand.",
                description="We collaborate with brides, planners, and venues to create decor that feels like an extension of the couple. Balloon-forward, floral-friendly, and always thoughtful.",
                price_from="$1,500+",
                hero_image_url="https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                images=["https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"],
                features=["Ceremony + reception decor", "Planner-friendly workflow", "COI available", "Floral collaborations"],
                packages=[
                    ServicePackage(name="Ceremony feature", price_from="$1,500", description="Statement arch or backdrop for your ceremony moment.", features=["Custom design", "Install + takedown"]),
                    ServicePackage(name="Full-service styling", price_from="$4,800", description="Ceremony + reception decor with florals and signage.", features=["Design meetings", "Mood board", "Rentals sourcing"]),
                ],
                order=2,
            ),
            Service(
                slug="birthday-parties",
                title="Birthday Parties",
                subtitle="From first birthdays to milestones — styled with love.",
                short_description="Balloon-forward birthday styling for every age.",
                description="Whether it's a smash cake shoot, a Sweet 16, or a milestone birthday, we design birthday moments that feel joyful and personal.",
                price_from="$450+",
                hero_image_url="https://images.unsplash.com/photo-1758870041148-31d28fdf34d9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                images=[],
                features=["Custom themes", "Photo-ready backdrops", "Dessert table styling", "Custom signage"],
                order=3,
            ),
            Service(
                slug="corporate-events",
                title="Corporate & Brand Events",
                subtitle="Launches, activations, and on-brand installs.",
                short_description="Elevated brand moments with clean lines and considered color.",
                description="We work with in-house marketing teams and agencies to bring branded activations, launches, and executive events to life.",
                price_from="$1,200+",
                hero_image_url="https://images.unsplash.com/photo-1758738181955-3f917d756275?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                images=[],
                features=["Brand color matching", "Logo integration", "COI + insurance", "Fast-turn quotes"],
                order=4,
            ),
            Service(
                slug="baby-showers",
                title="Baby Showers",
                subtitle="Soft, sweet, and endlessly Instagrammable.",
                short_description="Baby shower decor that feels calm, warm, and thoughtful.",
                description="Neutral palettes, sculptural balloon moments, and dessert tables designed to be the softest kind of celebration.",
                price_from="$550+",
                hero_image_url="https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                images=[],
                features=["Gender-reveal moments", "Dessert tables", "Custom name signs"],
                order=5,
            ),
            Service(
                slug="grand-openings",
                title="Grand Openings",
                subtitle="Ribbon cuttings, storefront moments, and brand launches.",
                short_description="Make an entrance guests can't stop photographing.",
                description="Storefront arches, entryway columns, and photo moments to turn opening day into a shareable moment.",
                price_from="$800+",
                hero_image_url="https://images.unsplash.com/photo-1758870041148-31d28fdf34d9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                images=[],
                features=["Storefront arches", "Same-week availability", "Brand alignment"],
                order=6,
            ),
        ]
        for s in services:
            await db.services.insert_one(doc_from_model(s))
        print(f"Seeded {len(services)} services")

    # ---- Gallery ----
    if await db.gallery.count_documents({}) == 0:
        gallery = [
            GalleryItem(title="Blush garden wedding", category="weddings", featured=True,
                        image_url="https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=1),
            GalleryItem(title="Ceremony arch detail", category="weddings", featured=True,
                        image_url="https://images.unsplash.com/photo-1649615644613-758b850399c1?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=2),
            GalleryItem(title="First birthday smash", category="birthdays", featured=True,
                        image_url="https://images.unsplash.com/photo-1758738181955-3f917d756275?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=3),
            GalleryItem(title="Milestone party", category="birthdays",
                        image_url="https://images.unsplash.com/photo-1758870041148-31d28fdf34d9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=4),
            GalleryItem(title="Cloud install", category="birthdays",
                        image_url="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=5),
            GalleryItem(title="Corporate activation", category="corporate", featured=True,
                        image_url="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=6),
            GalleryItem(title="Product launch", category="corporate",
                        image_url="https://images.unsplash.com/photo-1511578314322-379afb476865?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=7),
            GalleryItem(title="Neutral baby shower", category="showers", featured=True,
                        image_url="https://images.unsplash.com/photo-1602631985686-1bb0e6a8696e?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=8),
            GalleryItem(title="Bridal shower brunch", category="showers",
                        image_url="https://images.unsplash.com/photo-1519741497674-611481863552?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=9),
            GalleryItem(title="Holiday styling", category="holidays", featured=True,
                        image_url="https://images.unsplash.com/photo-1543269664-56d93c1b41a6?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=10),
            GalleryItem(title="Autumn celebration", category="holidays",
                        image_url="https://images.unsplash.com/photo-1509721434272-b79147e0e708?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=11),
            GalleryItem(title="Boutique grand opening", category="grand-openings", featured=True,
                        image_url="https://images.unsplash.com/photo-1519225421980-715cb0215aed?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85", order=12),
        ]
        for g in gallery:
            await db.gallery.insert_one(doc_from_model(g))
        print(f"Seeded {len(gallery)} gallery items")

    # ---- Testimonials ----
    if await db.testimonials.count_documents({}) == 0:
        testimonials = [
            Testimonial(name="Alyssa R.", event_type="Wedding", quote="Working with swell felt like collaborating with a friend who happens to be wildly talented. Our ceremony arch made me cry — in the best way.", rating=5, featured=True, order=1),
            Testimonial(name="Priya + James", event_type="Baby shower", quote="Every single guest asked about the balloon install. It was the softest, dreamiest set-up and it perfectly matched our nursery palette.", rating=5, featured=True, order=2),
            Testimonial(name="Nordstrom Local", event_type="Grand opening", quote="Turnkey, on-brand, and stress-free. The installation was up at 8 a.m. sharp and looked incredible on our storefront.", rating=5, featured=True, order=3),
            Testimonial(name="Maya K.", event_type="1st birthday", quote="She made my daughter's first birthday feel like a magazine editorial — and somehow it still felt warm and personal.", rating=5, order=4),
            Testimonial(name="Christina L.", event_type="Corporate", quote="Delivered a fully custom activation on a tight timeline. Communication was excellent. We're already planning our next event with her.", rating=5, order=5),
        ]
        for t in testimonials:
            await db.testimonials.insert_one(doc_from_model(t))
        print(f"Seeded {len(testimonials)} testimonials")

    # ---- FAQs ----
    if await db.faqs.count_documents({}) == 0:
        faqs = [
            FAQ(category="Booking", question="How far in advance should I book?", answer="For weekends, we recommend 4-8 weeks. For weddings, 2-4 months is ideal. We do accept last-minute inquiries when availability allows.", order=1),
            FAQ(category="Booking", question="Do you require a deposit?", answer="Yes — a 50% non-refundable retainer secures your date, with the balance due one week before your event.", order=2),
            FAQ(category="Design", question="Can you match specific colors?", answer="Absolutely. Send us a swatch, invitation, or Pinterest board and we'll build a palette that matches beautifully.", order=3),
            FAQ(category="Design", question="Do you offer floral additions?", answer="Yes — we collaborate with a small circle of trusted LA florists to weave real florals into balloon installs when the vision calls for it.", order=4),
            FAQ(category="Logistics", question="Do you install on-site?", answer="Yes, always. Every installation is delivered and built on-site by our team. Takedown is available for an added fee.", order=5),
            FAQ(category="Logistics", question="How long do balloons last outdoors?", answer="In shaded, mild conditions, 8-24 hours. In direct sun or high heat, quality can be affected within a few hours — we'll always advise the best plan for your venue.", order=6),
            FAQ(category="Areas", question="Where do you serve?", answer="Los Angeles and surrounding areas — including Malibu, Santa Monica, Pasadena, Long Beach, and the Valley. Beyond a 25-mile radius from DTLA, a small travel fee applies.", order=7),
            FAQ(category="Pricing", question="How much does an installation cost?", answer="Custom garlands start at $450. Statement installs typically range $950–$2,400. Full-service events start around $2,400 and scale with scope. Every quote is custom.", order=8),
        ]
        for f in faqs:
            await db.faqs.insert_one(doc_from_model(f))
        print(f"Seeded {len(faqs)} FAQs")

    # ---- Blog ----
    if await db.blog_posts.count_documents({}) == 0:
        posts = [
            BlogPost(
                slug="choosing-a-balloon-palette",
                title="Choosing a Balloon Palette That Feels Like You",
                excerpt="A calm, considered approach to color — no more overwhelming Pinterest boards.",
                content="Choosing a palette can feel overwhelming — but it doesn't have to. Start with a swatch you love (a fabric, a flower, a nursery paint chip) and build from there. We usually recommend one anchor color, two supporting tones, and a subtle accent...\n\nThe rest of the process should feel like storytelling — not stress.",
                cover_image_url="https://images.unsplash.com/photo-1649615644622-6d83f48e69c5?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                tags=["palette", "design tips"],
            ),
            BlogPost(
                slug="planning-a-first-birthday",
                title="Planning a First Birthday That's Beautiful (and Sane)",
                excerpt="Our favorite way to keep first birthdays sweet, styled, and stress-free.",
                content="First birthdays are magical — but they can also feel like a lot. Here's how we approach them at swell design + media...",
                cover_image_url="https://images.unsplash.com/photo-1758870041148-31d28fdf34d9?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                tags=["birthday", "planning"],
            ),
            BlogPost(
                slug="organic-vs-classic-garlands",
                title="Organic vs. Classic: Which Garland Style is Right for You?",
                excerpt="The difference is more than aesthetic — here's how to choose.",
                content="Organic garlands feel loose, artful, and unstructured — perfect for garden weddings and dreamy showers. Classic garlands are uniform and architectural — ideal for corporate events...",
                cover_image_url="https://images.unsplash.com/photo-1758738181955-3f917d756275?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
                tags=["design tips"],
            ),
        ]
        for p in posts:
            await db.blog_posts.insert_one(doc_from_model(p))
        print(f"Seeded {len(posts)} blog posts")

    print("Seed complete.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
