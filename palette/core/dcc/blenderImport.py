# Gradient Explorer -> Blender
# Open in the Scripting workspace and press Run, or: blender --python this_file.py
# Tested on Blender 5.0.1.

import bpy

# ---------------------------------------------------------------- payload ---
# >>> PAYLOAD — Gradient Explorer rewrites this block on export >>>
GRADIENTS = [                       # one entry, or a whole set in one file
    {
        "name": "Sunset Drift",
        "color_space": "srgb",      # "srgb" (web hex) | "linear"
        "interpolation": "EASE",    # EASE | CARDINAL | LINEAR | B_SPLINE | CONSTANT
        "stops": [                  # 2..32 stops -- Blender's hard ceiling is 32
            {"pos": 0.00, "color": "#0d0426", "alpha": 1.0},
            {"pos": 0.35, "color": "#cc1a4d", "alpha": 1.0},
            {"pos": 0.70, "color": "#fa9e19", "alpha": 1.0},
            {"pos": 1.00, "color": "#fff2d9", "alpha": 0.0},
        ],
    },
]
# <<< PAYLOAD <<<

TARGET = "material"      # "material" (new material w/ ramp -> Base Color)
                         # "node_group" (reusable ColorRamp group, no material)
# -----------------------------------------------------------------------------

MAX_STOPS = 32           # bpy: "Unable to add element to colorband (limit 32)"


def hex_to_rgb(value):
    if isinstance(value, (list, tuple)):
        return tuple(float(c) for c in value[:3])
    h = value.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def srgb_to_linear(c):
    """Blender node colours are scene-linear. A hex value off a web page is
    sRGB-encoded, so it must be linearised or everything reads washed out."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def to_scene_linear(rgb, source):
    if source == "linear":
        return tuple(rgb)
    return tuple(srgb_to_linear(c) for c in rgb)


def build_ramp(color_ramp, spec):
    stops = sorted(spec["stops"], key=lambda s: float(s["pos"]))
    if len(stops) > MAX_STOPS:
        raise ValueError("%d stops: Blender's ColorRamp holds at most %d. "
                         "Resample in Gradient Explorer before exporting."
                         % (len(stops), MAX_STOPS))
    src = spec.get("color_space", "srgb")

    color_ramp.interpolation = spec.get("interpolation", "EASE")
    color_ramp.color_mode = spec.get("color_mode", "RGB")

    # A new ramp starts with exactly two elements and the first cannot be
    # removed, so reuse element 0 and add the rest.
    while len(color_ramp.elements) > 1:
        color_ramp.elements.remove(color_ramp.elements[-1])

    for i, s in enumerate(stops):
        pos = max(0.0, min(1.0, float(s["pos"])))
        el = color_ramp.elements[0] if i == 0 else color_ramp.elements.new(pos)
        el.position = pos
        r, g, b = to_scene_linear(hex_to_rgb(s["color"]), src)
        el.color = (r, g, b, float(s.get("alpha", 1.0)))   # alpha IS color[3]
    return color_ramp


def make_material(spec):
    mat = bpy.data.materials.new(spec.get("name", "Gradient"))
    mat.use_nodes = True
    nt = mat.node_tree

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-500, 300)
    ramp.label = spec.get("name", "Gradient")
    build_ramp(ramp.color_ramp, spec)

    coord = nt.nodes.new("ShaderNodeTexCoord")
    coord.location = (-900, 300)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    sep.location = (-700, 300)
    nt.links.new(coord.outputs["UV"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["X"], ramp.inputs["Fac"])      # U drives the ramp

    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def make_node_group(spec):
    group = bpy.data.node_groups.new(spec.get("name", "Gradient"), "ShaderNodeTree")
    inp = group.nodes.new("NodeGroupInput")
    inp.location = (-300, 0)
    out = group.nodes.new("NodeGroupOutput")
    out.location = (300, 0)
    group.interface.new_socket("Fac", in_out="INPUT", socket_type="NodeSocketFloat")
    group.interface.new_socket("Color", in_out="OUTPUT", socket_type="NodeSocketColor")
    group.interface.new_socket("Alpha", in_out="OUTPUT", socket_type="NodeSocketFloat")

    ramp = group.nodes.new("ShaderNodeValToRGB")
    build_ramp(ramp.color_ramp, spec)
    group.links.new(inp.outputs["Fac"], ramp.inputs["Fac"])
    group.links.new(ramp.outputs["Color"], out.inputs["Color"])
    group.links.new(ramp.outputs["Alpha"], out.inputs["Alpha"])
    return group


def notify(title, lines):
    """Say so on screen. A script that prints into a console nobody has open has told
    nobody anything -- so this pops the info menu as well, and falls back to the print
    when there is no window manager to pop it (background, restricted context)."""
    for line in lines:
        print(line)
    if bpy.app.background:
        return
    try:
        def draw(self, _context):
            for line in lines:
                self.layout.label(text=line)
        bpy.context.window_manager.popup_menu(draw, title=title, icon="COLOR")
    except Exception as exc:
        print("Gradient Explorer: could not pop the notice (%s)" % exc)


def main():
    kind = "node group" if TARGET == "node_group" else "material"
    made = []
    for spec in GRADIENTS:
        made.append(make_node_group(spec) if TARGET == "node_group" else make_material(spec))
    notify("Gradient Explorer",
           ["Imported %d gradient%s as %s%s:" % (len(made), "" if len(made) == 1 else "s",
                                                 kind, "" if len(made) == 1 else "s")]
           + ["  %s (%d stops)" % (m.name, len(s["stops"])) for m, s in zip(made, GRADIENTS)])
    return made


if __name__ == "__main__":
    main()
