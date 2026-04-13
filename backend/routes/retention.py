from flask import Blueprint, jsonify
from services.auth import login_required, get_current_user_id
from utils.retention import check_retention_triggers


retention_bp = Blueprint("retention", __name__)


@retention_bp.route("/check", methods=["POST"])
@login_required
def run_retention():
    user_id = get_current_user_id()
    check_retention_triggers(user_id)
    return jsonify({"message": "Retention triggers evaluated"}), 200
