# Gradient Explorer -> Cinema 4D
# Paste into the Script Manager (Extensions > Script Manager) and press Execute.
# Tested on Cinema 4D 2026.2.

import c4d

# ---------------------------------------------------------------- payload ---
# Everything above the line is written by Gradient Explorer.
# >>> PAYLOAD — Gradient Explorer rewrites this block on export >>>
GRADIENT = {
    "name": "Sunset Drift",
    "color_space": "srgb",          # "srgb" (web hex) | "linear" | "raw"
    "stops": [
        {"pos": 0.00, "color": "#0d0426", "alpha": 1.0},
        {"pos": 0.35, "color": "#cc1a4d", "alpha": 1.0, "bias": 0.35, "interp": "linearknot"},
        {"pos": 0.70, "color": "#fa9e19", "alpha": 1.0},
        {"pos": 1.00, "color": "#fff2d9", "alpha": 0.0},
    ],
}
# <<< PAYLOAD <<<

TARGET = "auto"        # "auto" | "standard" | "redshift" | "both"
GRADIENT_TYPE = c4d.SLA_GRADIENT_TYPE_2D_U     # 2D U/V/diag/rad/box/star, 3D linear/cyl/sph
ANGLE = 0.0
# -----------------------------------------------------------------------------

INTERP = {                       # name -> (classic int, redshift InternedId)
    "cubicknot": (0, "cubicknot"),
    "cubicbias": (1, "cubicbias"),
    "smoothknot": (2, "smoothknot"),
    "linearknot": (3, "linearknot"),
    "step": (5, "none"),
    "none": (5, "none"),
    "exp_up": (6, "exp_up"),
    "exp_down": (7, "exp_down"),
    "blend": (8, "blend"),
}

RS_SPACE = "com.redshift3d.redshift4c4d.class.nodespace"
RS_RAMP = "com.redshift3d.redshift4c4d.nodes.core.rsramp"
RS_STD = "com.redshift3d.redshift4c4d.nodes.core.standardmaterial"


def hex_to_rgb(value):
    if isinstance(value, (list, tuple)):
        return tuple(float(c) for c in value[:3])
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def to_render_space(rgb, doc, source):
    """A hex colour off a web page is an sRGB DISPLAY value. C4D reads raw
    values as render space (ACEScg in an OCIO document), so it must be
    converted or the ramp comes out too bright and too saturated."""
    v = c4d.Vector(*rgb)
    if source == "raw":
        return v
    if doc[c4d.DOCUMENT_COLOR_MANAGEMENT] == c4d.DOCUMENT_COLOR_MANAGEMENT_OCIO:
        conv = doc.GetColorConverter()
        return conv.TransformColor(v, c4d.COLORSPACETRANSFORMATION_OCIO_SRGB_TO_RENDERING
                                   if source == "srgb" else
                                   c4d.COLORSPACETRANSFORMATION_OCIO_LINEAR_TO_RENDERING)
    if source == "srgb":
        return c4d.utils.TransformColor(v, c4d.COLORSPACETRANSFORMATION_SRGB_TO_LINEAR)
    return v


def build_gradient(spec, doc):
    stops = spec["stops"]
    src = spec.get("color_space", "srgb")
    has_alpha = any(s.get("alpha", 1.0) < 1.0 for s in stops)

    grad = c4d.Gradient()
    grad.FlushKnots()
    for s in stops:
        grad.InsertKnot(to_render_space(hex_to_rgb(s["color"]), doc, src),
                        float(s.get("brightness", 1.0)),
                        max(0.0, min(1.0, float(s["pos"]))),
                        max(0.0, min(1.0, float(s.get("bias", 0.5)))), 0)

    # per-knot interpolation lives in the knot container, and GetData returns a
    # COPY -- it has to be written back with SetData or the change is lost.
    kd = grad.GetData(c4d.GRADIENT_KNOT)
    for i, s in enumerate(stops):
        knot = kd.GetIndexData(i)
        knot[c4d.GRADIENTKNOT_INTERPOLATION] = INTERP.get(s.get("interp", "smoothknot"),
                                                          INTERP["smoothknot"])[0]
        kd.SetIndexData(i, knot)
    grad.SetData(c4d.GRADIENT_KNOT, kd)
    grad.SetData(c4d.GRADIENT_MODE,
                 c4d.GRADIENTMODE_COLORALPHA if has_alpha else c4d.GRADIENTMODE_COLOR)
    grad.SetData(c4d.GRADIENT_UNCLAMPED, False)

    if has_alpha:
        # GetAlphaGradient() hands back a DETACHED COPY -- edits to it are lost
        # unless it is written back with SetAlphaGradient().
        alpha = grad.GetAlphaGradient()
        if alpha is not None:
            alpha.FlushKnots()
            for s in stops:
                a = float(s.get("alpha", 1.0))
                alpha.InsertKnot(c4d.Vector(a, a, a), 1.0,
                                 max(0.0, min(1.0, float(s["pos"]))),
                                 max(0.0, min(1.0, float(s.get("bias", 0.5)))), 0)
            grad.SetAlphaGradient(alpha)
    return grad


def make_standard_material(spec, doc, insert=True):
    grad = build_gradient(spec, doc)
    sh = c4d.BaseShader(c4d.Xgradient)
    sh[c4d.SLA_GRADIENT_GRADIENT] = grad
    sh[c4d.SLA_GRADIENT_TYPE] = GRADIENT_TYPE
    sh[c4d.SLA_GRADIENT_ANGLE] = ANGLE

    mat = c4d.BaseMaterial(c4d.Mmaterial)
    mat.SetName(spec.get("name", "Gradient"))
    mat.InsertShader(sh)                       # required, else the link is dead
    mat[c4d.MATERIAL_COLOR_SHADER] = sh
    if insert:
        doc.InsertMaterial(mat)
    return mat


def make_redshift_material(spec, doc, insert=True):
    import maxon
    src = spec.get("color_space", "srgb")
    mat = c4d.BaseMaterial(c4d.Mmaterial)
    mat.SetName(spec.get("name", "Gradient") + " RS")
    nm = mat.GetNodeMaterialReference()
    nm.CreateDefaultGraph(maxon.Id(RS_SPACE))
    graph = nm.GetGraph(maxon.Id(RS_SPACE))

    with graph.BeginTransaction() as tr:
        node = graph.AddChild(maxon.Id(), maxon.Id(RS_RAMP), maxon.DataDictionary())
        ramp = node.GetInputs().FindChild(RS_RAMP + ".ramp")
        for child in list(ramp.GetChildren()):        # drop the two defaults
            child.Remove()
        for i, s in enumerate(spec["stops"]):
            col = to_render_space(hex_to_rgb(s["color"]), doc, src)
            e = ramp.AddPort(maxon.Id("_%d" % i))
            e.FindChild("position").SetDefaultValue(
                maxon.Float64(max(0.0, min(1.0, float(s["pos"])))))
            e.FindChild("color").SetDefaultValue(maxon.Color64(col.x, col.y, col.z))
            e.FindChild("interpolation").SetDefaultValue(maxon.InternedId(
                INTERP.get(s.get("interp", "smoothknot"), INTERP["smoothknot"])[1]))
            e.FindChild("bias").SetDefaultValue(
                maxon.Float64(max(0.0, min(1.0, float(s.get("bias", 0.5))))))

        # Identify the material node by its graph path ("standardmaterial@<id>").
        # FindChild() returns a NULL GraphNode rather than None when a port is
        # absent, and that null object is still truthy -- so every port lookup
        # has to be checked with IsNullValue() or Connect() dies on a nullptr.
        std = None
        for n in graph.GetRoot().GetInnerNodes(maxon.NODE_KIND.NODE, False):
            if str(n.GetPath()).split("@")[0].endswith("material"):
                std = n
                break
        if std is not None:
            src = node.GetOutputs().FindChild(RS_RAMP + ".outcolor")
            dst = std.GetInputs().FindChild(RS_STD + ".base_color")
            if not src.IsNullValue() and not dst.IsNullValue():
                src.Connect(dst)
        tr.Commit()

    if insert:
        doc.InsertMaterial(mat)
    return mat


def redshift_available():
    return bool(c4d.plugins.FindPlugin(1036219, c4d.PLUGINTYPE_ANY))


def main():
    made = []
    target = TARGET
    if target == "auto":
        target = "redshift" if redshift_available() else "standard"
    if target in ("standard", "both"):
        made.append(make_standard_material(GRADIENT, doc))
    if target in ("redshift", "both") and redshift_available():
        made.append(make_redshift_material(GRADIENT, doc))
    c4d.EventAdd()
    print("Imported '%s' (%d stops) -> %s" %
          (GRADIENT.get("name", "Gradient"), len(GRADIENT["stops"]),
           ", ".join(m.GetName() for m in made)))


if __name__ == "__main__":
    main()
