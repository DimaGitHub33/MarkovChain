import streamlit as st

st.set_page_config(page_title="Customer Care Call Prediction", page_icon="📞", layout="wide")

pages = [
    st.Page("app_pages/overview.py", title="Overview", icon="📘", default=True),
    st.Page("app_pages/how_it_works.py", title="How It Works", icon="🗺️", url_path="how-it-works"),
    st.Page("app_pages/behavior_patterns.py", title="Behavior Patterns", icon="📊", url_path="patterns"),
    st.Page("app_pages/predict.py", title="Predict", icon="📞", url_path="predict"),
]

st.navigation(pages).run()
