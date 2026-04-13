from flask import Blueprint, current_app, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from database import db, Report, User
from services.auth import get_current_user_id, login_required
import os
import uuid

reports_bp = Blueprint("reports", __name__)

ALLOWED_SCREENSHOT_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def _is_allowed(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_SCREENSHOT_EXTENSIONS


def _is_admin(user_id):
    user = User.query.get(user_id)
    return bool(user and str(user.role).strip().lower() == "admin")


@reports_bp.route("/", methods=["POST"])
@login_required
def create_report():
    user_id = get_current_user_id()
    title = ""
    description = ""
    report_type = "other"
    screenshot_name = ""

    if request.content_type and "multipart" in request.content_type:
        title = (request.form.get("title") or "").strip()
        description = (request.form.get("description") or "").strip()
        report_type = (request.form.get("type") or "other").strip().lower()
        screenshot = request.files.get("screenshot")
        if screenshot and screenshot.filename:
            if not _is_allowed(screenshot.filename):
                return jsonify({"error": "Unsupported screenshot format"}), 400
            ext = screenshot.filename.rsplit(".", 1)[1].lower()
            screenshot_name = f"report_{uuid.uuid4().hex}_{secure_filename(screenshot.filename)}"
            if not screenshot_name.lower().endswith(f".{ext}"):
                screenshot_name = f"{screenshot_name}.{ext}"
            screenshot.save(os.path.join(current_app.config["UPLOAD_FOLDER"], screenshot_name))
    else:
        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        report_type = (data.get("type") or "other").strip().lower()

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if report_type not in {"bug", "feature_request", "other"}:
        report_type = "other"

    report = Report(
        user_id=user_id,
        title=title,
        description=description,
        type=report_type,
        screenshot=screenshot_name,
        status="pending",
    )
    db.session.add(report)
    db.session.commit()
    return jsonify(report.to_dict()), 201


@reports_bp.route("/", methods=["GET"])
@login_required
def list_reports():
    user_id = get_current_user_id()
    if _is_admin(user_id):
        reports = Report.query.order_by(Report.created_at.desc()).all()
    else:
        reports = Report.query.filter_by(user_id=user_id).order_by(Report.created_at.desc()).all()
    return jsonify([report.to_dict() for report in reports]), 200


@reports_bp.route("/<int:report_id>/status", methods=["PUT"])
@login_required
def update_report_status(report_id):
    user_id = get_current_user_id()
    if not _is_admin(user_id):
        return jsonify({"error": "Admin only"}), 403
    report = Report.query.get_or_404(report_id)
    data = request.get_json() or {}
    status = str(data.get("status") or "").strip().lower()
    if status not in {"pending", "resolved"}:
        return jsonify({"error": "Invalid status"}), 400
    report.status = status
    db.session.commit()
    return jsonify(report.to_dict()), 200


@reports_bp.route("/screenshot/<filename>", methods=["GET"])
def serve_screenshot(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
