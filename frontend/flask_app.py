from flask import Flask, render_template, request

# Initialize the Flask application
flask_app = Flask(
    __name__,
    template_folder="templates",   # Path to Jinja templates
    static_folder="static"         # Path to static files (CSS, JS, etc.)
)

@flask_app.route('/')
def home():
    # Get the user_id from the cookies
    user_id = request.cookies.get('user_id')
    
    return render_template("index.htm", user_id=user_id)
