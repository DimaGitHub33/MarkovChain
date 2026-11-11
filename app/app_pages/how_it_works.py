import base64
from pathlib import Path

import streamlit as st

# Exported from views/diagram.drawio at 2x resolution; re-export it after editing the diagram.
DIAGRAM_PATH = Path(__file__).resolve().parents[2] / "views" / "diagram.png"
DIAGRAM_WIDTH = 1680  # the diagram's own width in draw.io, i.e. 100% zoom
ZOOM_WIDTHS = {"Fit": None, "100%": DIAGRAM_WIDTH, "150%": int(DIAGRAM_WIDTH * 1.5)}


@st.cache_data
def diagram_base64():
    return base64.b64encode(DIAGRAM_PATH.read_bytes()).decode()


def diagram_html(width):
    # Embedded as HTML (not st.image) to keep the full resolution and allow scrolling when zoomed.
    image_width = f"{width}px" if width else "100%"
    return (
        '<div style="overflow:auto; max-height:85vh; background:#ffffff; border-radius:10px; '
        'border:1px solid rgba(128,128,128,0.35); padding:8px;">'
        f'<img src="data:image/png;base64,{diagram_base64()}" alt="Process diagram" '
        f'style="width:{image_width}; max-width:none; display:block;"></div>'
    )


st.title("🗺️ How the Model Works")
st.markdown("How the two Markov models are built, and how they are used to classify a user.")

col_build, col_classify = st.columns(2)
with col_build:
    st.markdown(
        "**Phase A — Build the models.** Take users whose outcome is known, turn each user's "
        "events into a sequence of states, split the sequences by whether the user called, and "
        "learn one transition matrix per group."
    )
with col_classify:
    st.markdown(
        "**Phase B — Classify a user.** Build the new user's sequence the same way, compute its "
        "likelihood under both matrices, and assign the user to the group with the highest likelihood."
    )

zoom = st.segmented_control("Zoom", list(ZOOM_WIDTHS), default="Fit", key="diagram_zoom",
                            help="Zoom in to read the details, then scroll inside the frame.")
st.html(diagram_html(ZOOM_WIDTHS.get(zoom or "Fit")))
