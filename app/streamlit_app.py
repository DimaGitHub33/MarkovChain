import streamlit as st

st.set_page_config(page_title="Customer Care Call Prediction", page_icon="📞", layout="wide")

pages = [
    st.Page("app_pages/introduction.py", title="Introduction", icon="📘", default=True),
    st.Page("app_pages/model_process.py", title="Model Process", icon="🗺️"),
    st.Page("app_pages/group_behavior.py", title="Group Behavior", icon="🧭"),
    st.Page("app_pages/generate_sequences.py", title="Generate Sequence", icon="🎲"),
]

st.navigation(pages).run()
