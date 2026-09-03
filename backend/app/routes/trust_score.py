from datetime import datetime, timezone, timedelta

from flask import Blueprint, jsonify
from app.extensions import db
from app.models import Property, Review, User

trust_score_bp = Blueprint("trust_score", __name__, url_prefix="/api/trust-score")


def compute_trust_score(property_id):
    prop = db.session.get(Property, property_id)
    if not prop:
        return None

    score = 0
    breakdown = []

    # 1. Verified host (+25)
    if prop.verified_host:
        score += 25
        breakdown.append({"label": "Verified host", "points": 25})

    # 2. Real reviews with good rating (+20)
    reviews = Review.query.filter_by(property_id=property_id).all()
    if reviews:
        avg = sum(r.rating for r in reviews) / len(reviews)
        if avg >= 4.0:
            score += 20
            breakdown.append({"label": f"High rating ({avg:.1f}/5 from {len(reviews)} reviews)", "points": 20})
        elif avg >= 3.0:
            score += 10
            breakdown.append({"label": f"Good rating ({avg:.1f}/5 from {len(reviews)} reviews)", "points": 10})
        else:
            breakdown.append({"label": f"Low rating ({avg:.1f}/5)", "points": 0})
    else:
        breakdown.append({"label": "No reviews yet", "points": 0})

    # 3. Realistic price for area — flag suspiciously cheap listings (+15)
    price = float(prop.price_per_month or 0)
    if price >= 5000:
        score += 15
        breakdown.append({"label": "Realistic price range", "points": 15})
    else:
        breakdown.append({"label": "Price seems unusually low", "points": 0})

    # 4. Has a property image (+10)
    if prop.image:
        score += 10
        breakdown.append({"label": "Property photo provided", "points": 10})
    else:
        breakdown.append({"label": "No property photo", "points": 0})

    # 5. Host account age > 30 days (+10)
    host = db.session.get(User, prop.host_id)
    if host and host.created_at:
        age_days = (datetime.now(timezone.utc) - host.created_at).days
        if age_days >= 30:
            score += 10
            breakdown.append({"label": f"Established host ({age_days} days on Qrib)", "points": 10})
        else:
            breakdown.append({"label": f"New host account ({age_days} days old)", "points": 0})

    # 6. Has coordinates — real verifiable location (+8)
    if prop.latitude and prop.longitude:
        score += 8
        breakdown.append({"label": "Location coordinates verified", "points": 8})
    else:
        breakdown.append({"label": "No GPS coordinates", "points": 0})

    # 7. Utility costs declared — transparent host (+7)
    water = float(prop.water_cost or 0)
    electricity = float(prop.electricity_cost or 0)
    if water > 0 or electricity > 0:
        score += 7
        breakdown.append({"label": "Utility costs declared", "points": 7})
    else:
        breakdown.append({"label": "Utility costs not declared", "points": 0})

    # 8. Semester availability set — organised host (+5)
    if prop.semester_label:
        score += 5
        breakdown.append({"label": "Availability period specified", "points": 5})

    # Clamp to 100
    score = min(score, 100)

    if score >= 80:
        label = "Highly Trusted"
        color = "emerald"
    elif score >= 60:
        label = "Trusted"
        color = "blue"
    elif score >= 40:
        label = "Moderate"
        color = "amber"
    else:
        label = "Low Trust"
        color = "red"

    return {
        "property_id": property_id,
        "score": score,
        "label": label,
        "color": color,
        "breakdown": breakdown,
    }


@trust_score_bp.get("/<int:property_id>")
def get_trust_score(property_id):
    result = compute_trust_score(property_id)
    if not result:
        return jsonify({"error": "Property not found"}), 404
    return jsonify(result), 200


@trust_score_bp.get("/batch")
def get_batch_trust_scores():
    """Return trust scores for all properties — used to badge listing cards."""
    properties = Property.query.with_entities(Property.id).all()
    scores = {}
    for (pid,) in properties:
        result = compute_trust_score(pid)
        if result:
            scores[pid] = {"score": result["score"], "label": result["label"], "color": result["color"]}
    return jsonify(scores), 200
