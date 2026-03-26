from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt


print("NEUE VERSION STARTET")

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

TEAM_NAME_CANDIDATES = {
    "Bayern Munich": [
        "Bayern Munich",
        "Bayern München",
        "FC Bayern Munich",
        "FC Bayern München",
    ],
    "Real Madrid": [
        "Real Madrid",
        "Real Madrid CF",
    ],
}

STANDARD_NUMERIC_COLS = ["MP", "Poss", "Gls", "Ast"]
SHOOTING_NUMERIC_COLS = ["Sh", "SoT", "SoT%", "G/Sh", "G/SoT", "PK", "PKatt", "90s"]
GOALKEEPING_NUMERIC_COLS = [
    "# Pl", "MP", "Starts", "Min", "90s", "GA", "GA90",
    "SoTA", "Saves", "Save%", "CS", "CS%"
]
GOALKEEPING_EXPECTED_COLS = [
    "Squad", "# Pl", "MP", "Starts", "Min", "90s", "GA", "GA90",
    "SoTA", "Saves", "Save%", "W", "D", "L", "CS", "CS%",
    "PKatt", "PKA", "PKsv", "PKm", "Save%.1"
]
SHOOTING_OUTPUT_COLS = [
    "Sh", "SoT", "SoT%", "G/Sh", "G/SoT",
    "PK", "PKatt", "Sh/90_berechnet", "SoT/90_berechnet"
]


# =========================
# HILFSFUNKTIONEN
# =========================

def clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(col).strip() for col in df.columns]
    return df


def clean_object_values(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for col in df.columns:
        current = df[col]
        if isinstance(current, pd.Series) and current.dtype == "object":
            df[col] = current.astype(str).str.strip()
    return df


def normalize_squad_names(df: pd.DataFrame, remove_country_prefix: bool = False) -> pd.DataFrame:
    df = df.copy()
    if "Squad" in df.columns:
        squad = (
            df["Squad"]
            .astype(str)
            .str.strip()
            .str.replace(r"\s+", " ", regex=True)
            .str.replace("*", "", regex=False)
        )

        if remove_country_prefix:
            squad = squad.str.replace(r"^[a-z]{2,3}\s+", "", regex=True)

        df["Squad"] = squad
        df = df[df["Squad"].str.lower() != "squad"]
        df = df[df["Squad"].str.lower() != "nan"]

    return df


def to_num(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype(str)
        .str.strip()
        .str.replace(",", ".", regex=False)
        .str.replace("%", "", regex=False),
        errors="coerce"
    )


def convert_numeric_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    df = df.copy()
    for col in columns:
        if col in df.columns:
            df[col] = to_num(df[col])
    return df


def flatten_multiindex_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    new_cols = []

    for col in df.columns:
        if isinstance(col, tuple):
            first = str(col[0]).strip()
            second = str(col[1]).strip()
            if second and not second.startswith("Unnamed"):
                new_cols.append(second)
            else:
                new_cols.append(first)
        else:
            new_cols.append(str(col).strip())

    df.columns = new_cols
    df = df.loc[:, ~pd.Index(df.columns).duplicated(keep="first")]
    return df


def load_standard_csv(path: Path, remove_country_prefix: bool = False) -> pd.DataFrame:
    df = pd.read_csv(path, sep=";", skiprows=1)
    df = clean_columns(df)
    df = clean_object_values(df)

    if "Squad" not in df.columns and len(df.columns) > 0:
        cols = list(df.columns)
        cols[0] = "Squad"
        df.columns = cols

    df = normalize_squad_names(df, remove_country_prefix=remove_country_prefix)
    df = convert_numeric_columns(df, STANDARD_NUMERIC_COLS)
    return df


def load_shooting_csv(path: Path, remove_country_prefix: bool = False) -> pd.DataFrame:
    try:
        df = pd.read_csv(path, sep=";", skiprows=1, header=[0, 1])
        df = flatten_multiindex_columns(df)
    except Exception:
        df = pd.read_csv(path, sep=";", skiprows=1)
        df = clean_columns(df)

    if "Squad" not in df.columns:
        df = pd.read_csv(path, sep=";", skiprows=1)
        df = clean_columns(df)
        df = df.loc[:, ~pd.Index(df.columns).duplicated(keep="first")]

    if "Squad" not in df.columns and len(df.columns) > 0:
        cols = list(df.columns)
        cols[0] = "Squad"
        df.columns = cols

    df = clean_object_values(df)
    df = normalize_squad_names(df, remove_country_prefix=remove_country_prefix)

    needed = ["Squad", "Sh", "SoT", "SoT%", "G/Sh", "G/SoT", "PK", "PKatt", "90s"]
    if not all(col in df.columns for col in needed):
        current_cols = list(df.columns)
        if len(current_cols) >= 15:
            rename_map = {
                current_cols[0]: "Squad",
                current_cols[2]: "90s",
                current_cols[4]: "Sh",
                current_cols[5]: "SoT",
                current_cols[6]: "SoT%",
                current_cols[9]: "G/Sh",
                current_cols[10]: "G/SoT",
                current_cols[13]: "PK",
                current_cols[14]: "PKatt",
            }
            df = df.rename(columns=rename_map)

    df = convert_numeric_columns(df, SHOOTING_NUMERIC_COLS)

    if {"Sh", "90s"}.issubset(df.columns):
        df["Sh/90_berechnet"] = df["Sh"] / df["90s"]

    if {"SoT", "90s"}.issubset(df.columns):
        df["SoT/90_berechnet"] = df["SoT"] / df["90s"]

    return df


def load_goalkeeping_csv(path: Path, remove_country_prefix: bool = False) -> pd.DataFrame:
    df = pd.read_csv(path, sep=";", skiprows=1)
    df = clean_columns(df)
    df = clean_object_values(df)
    df = df.loc[:, ~df.columns.astype(str).str.contains("^Unnamed", na=False)]

    if "Squad" not in df.columns and len(df.columns) > 0:
        cols = list(df.columns)
        cols[0] = "Squad"
        df.columns = cols

    if len(df.columns) >= len(GOALKEEPING_EXPECTED_COLS):
        df.columns = GOALKEEPING_EXPECTED_COLS + list(df.columns[len(GOALKEEPING_EXPECTED_COLS):])

    df = normalize_squad_names(df, remove_country_prefix=remove_country_prefix)
    df = convert_numeric_columns(df, GOALKEEPING_NUMERIC_COLS)

    if {"SoTA", "90s"}.issubset(df.columns):
        df["SoTA_per_90"] = df["SoTA"] / df["90s"]

    if {"Saves", "90s"}.issubset(df.columns):
        df["Saves_per_90"] = df["Saves"] / df["90s"]

    return df


def find_team_row(df: pd.DataFrame, team_key: str, dataset_name: str) -> pd.DataFrame:
    if "Squad" not in df.columns:
        raise ValueError(f"{dataset_name}: keine 'Squad'-Spalte gefunden.")

    candidates = TEAM_NAME_CANDIDATES[team_key]

    for name in candidates:
        hit = df[df["Squad"].str.lower() == name.lower()].copy()
        if not hit.empty:
            return hit

    raise ValueError(f"{dataset_name}: kein passender Teamname gefunden.")


def require_columns(df: pd.DataFrame, columns: list[str], dataset_name: str):
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise ValueError(f"{dataset_name}: fehlende Spalten -> {missing}")


def build_stats_dict(standard_row: pd.Series, shooting_row: pd.Series, gk_row: pd.Series) -> dict:
    return {
        "goals_per_game": float(standard_row["Gls"] / standard_row["MP"]),
        "shots_per_90": float(shooting_row["Sh/90_berechnet"]),
        "sot_per_90": float(shooting_row["SoT/90_berechnet"]),
        "efficiency": float(shooting_row["G/Sh"]),
        "possession": float(standard_row["Poss"]),
        "sota_per_90": float(gk_row["SoTA_per_90"]),
        "save_pct": float(gk_row["Save%"]),
    }


def compare_metric(a_value: float, b_value: float, lower_is_better: bool = False) -> int:
    if pd.isna(a_value) or pd.isna(b_value):
        return 0
    if a_value == b_value:
        return 0
    if lower_is_better:
        return 1 if a_value < b_value else -1
    return 1 if a_value > b_value else -1


def print_match_summary(label: str, stats_a: dict, stats_b: dict, team_a: str = "Bayern", team_b: str = "Real") -> tuple[int, int]:
    print(f"\n===== {label} =====")
    print(f"{team_a}: {stats_a}")
    print(f"{team_b}: {stats_b}")

    print("\n===== ANALYSTEN BEWERTUNG =====")

    checks = [
        ("shots_per_90", f"{team_a} hat höheres Offensivvolumen.", f"{team_b} hat höheres Offensivvolumen.", False),
        ("sot_per_90", f"{team_a} bringt mehr Schüsse aufs Tor.", f"{team_b} bringt mehr Schüsse aufs Tor.", False),
        ("efficiency", f"{team_a} ist effizienter im Abschluss.", f"{team_b} ist effizienter im Abschluss.", False),
        ("possession", f"{team_a} kontrolliert das Spiel stärker.", f"{team_b} kontrolliert das Spiel stärker.", False),
        ("sota_per_90", f"{team_a} erlaubt weniger Torschüsse des Gegners.", f"{team_b} erlaubt weniger Torschüsse des Gegners.", True),
        ("save_pct", f"{team_a} hat die stärkere Torwart-/Paradenquote.", f"{team_b} hat die stärkere Torwart-/Paradenquote.", False),
    ]

    score_a = 0
    score_b = 0

    for key, a_text, b_text, lower_is_better in checks:
        result = compare_metric(stats_a[key], stats_b[key], lower_is_better=lower_is_better)

        if result == 1:
            print(a_text)
            score_a += 1
        elif result == -1:
            print(b_text)
            score_b += 1
        else:
            print(f"{team_a} und {team_b} sind bei {key} gleichauf.")

    print("\n===== MATCH PROGNOSE =====")
    print(f"{team_a} Score: {score_a}")
    print(f"{team_b} Score: {score_b}")

    if score_a > score_b:
        print(f"→ Prognose: {team_a} gewinnt")
    elif score_b > score_a:
        print(f"→ Prognose: {team_b} gewinnt")
    else:
        print("→ Prognose: ausgeglichenes Spiel")

    print("\n===== FINALES GESAMTFAZIT =====")
    print(
        f"{team_a} erzielt im Schnitt {stats_a['goals_per_game']:.2f} Tore pro Spiel "
        f"und kommt auf {stats_a['shots_per_90']:.2f} Schüsse sowie "
        f"{stats_a['sot_per_90']:.2f} Schüsse aufs Tor pro 90 Minuten."
    )
    print(
        f"{team_b} erzielt im Schnitt {stats_b['goals_per_game']:.2f} Tore pro Spiel "
        f"und kommt auf {stats_b['shots_per_90']:.2f} Schüsse sowie "
        f"{stats_b['sot_per_90']:.2f} Schüsse aufs Tor pro 90 Minuten."
    )
    print(
        f"Defensiv lässt {team_a} {stats_a['sota_per_90']:.2f} Schüsse aufs Tor gegen sich zu, "
        f"{team_b} {stats_b['sota_per_90']:.2f}."
    )
    print(
        f"Die Paradenquote liegt bei {team_a} bei {stats_a['save_pct']:.1f}%, "
        f"bei {team_b} bei {stats_b['save_pct']:.1f}%."
    )

    return score_a, score_b


# =========================
# PLOTS
# =========================

def create_basic_bar_plot(team_a_row: pd.DataFrame, team_b_row: pd.DataFrame, save_path: Path, title: str):
    comparison = pd.concat([
        team_a_row[["Squad", "MP", "Poss", "Gls", "Ast"]],
        team_b_row[["Squad", "MP", "Poss", "Gls", "Ast"]],
    ], ignore_index=True)

    plot_df = comparison.set_index("Squad")[["Poss", "Gls", "Ast"]]
    plot_df.plot(kind="bar", figsize=(10, 6))
    plt.title(title)
    plt.xlabel("Team")
    plt.ylabel("Wert")
    plt.xticks(rotation=0)
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()


def create_extended_bar_plot(stats_a: dict, stats_b: dict, save_path: Path, title: str, team_a: str = "Bayern Munich", team_b: str = "Real Madrid"):
    comparison = pd.DataFrame({
        "Team": [team_a, team_b],
        "Sh/90": [stats_a["shots_per_90"], stats_b["shots_per_90"]],
        "SoT/90": [stats_a["sot_per_90"], stats_b["sot_per_90"]],
        "SoTA/90": [stats_a["sota_per_90"], stats_b["sota_per_90"]],
        "Save%": [stats_a["save_pct"], stats_b["save_pct"]],
    })

    print("\nERWEITERTER VERGLEICH:")
    print(comparison)

    plot_df = comparison.set_index("Team")
    plot_df.plot(kind="bar", figsize=(12, 6))
    plt.title(title)
    plt.xlabel("Team")
    plt.ylabel("Wert")
    plt.xticks(rotation=0)
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()


def create_scout_plot(stats_a: dict, stats_b: dict, save_path: Path, title: str, team_a: str = "Bayern Munich", team_b: str = "Real Madrid"):
    plt.style.use("dark_background")

    metrics = [
        ("Goals/Game", stats_a["goals_per_game"], stats_b["goals_per_game"], False),
        ("Shots/90", stats_a["shots_per_90"], stats_b["shots_per_90"], False),
        ("Shots on Target/90", stats_a["sot_per_90"], stats_b["sot_per_90"], False),
        ("Possession (%)", stats_a["possession"], stats_b["possession"], False),
        ("Shots Against/90 ↓", stats_a["sota_per_90"], stats_b["sota_per_90"], True),
        ("Save Rate (%)", stats_a["save_pct"], stats_b["save_pct"], False),
    ]

    labels = []
    plot_a = []
    plot_b = []
    raw_a = []
    raw_b = []
    min_visible = 18

    for label, a_val, b_val, lower_is_better in metrics:
        labels.append(label)
        raw_a.append(a_val)
        raw_b.append(b_val)

        max_val = max(a_val, b_val)
        min_val = min(a_val, b_val)

        if max_val == min_val:
            a_norm = 50
            b_norm = 50
        else:
            if lower_is_better:
                a_norm = (max_val - a_val) / (max_val - min_val) * 100
                b_norm = (max_val - b_val) / (max_val - min_val) * 100
            else:
                a_norm = (a_val - min_val) / (max_val - min_val) * 100
                b_norm = (b_val - min_val) / (max_val - min_val) * 100

            if a_norm == 0:
                a_norm = min_visible
            if b_norm == 0:
                b_norm = min_visible

        plot_a.append(a_norm)
        plot_b.append(b_norm)

    y = np.arange(len(labels))

    fig, ax = plt.subplots(figsize=(14, 8))
    fig.patch.set_facecolor("black")
    ax.set_facecolor("black")

    color_a = "#d00027"
    color_b = "#f2f2f2"
    text_color = "#66c2ff"

    ax.barh(y, plot_a, color=color_a, label=team_a, height=0.8)
    ax.barh(y, [-x for x in plot_b], color=color_b, label=team_b, height=0.8)

    ax.set_yticks(y)
    ax.set_yticklabels(labels, color=text_color, fontsize=14)

    for i, (a_plot, b_plot, a_value, b_value) in enumerate(zip(plot_a, plot_b, raw_a, raw_b)):
        ax.text(a_plot / 2, i + 0.18, f"{a_value:.2f}", color="black", va="center", ha="center", fontsize=12, fontweight="bold")
        ax.text(-b_plot / 2, i - 0.18, f"{b_value:.2f}", color="black", va="center", ha="center", fontsize=12, fontweight="bold")

    ax.axvline(0, color=text_color, linewidth=1.2)
    ax.set_xlabel("Relative Strength", color=text_color, fontsize=14)
    ax.set_title(title, color=text_color, pad=14, fontsize=20)
    ax.tick_params(axis="x", colors=text_color, labelsize=12)
    ax.tick_params(axis="y", colors=text_color)
    ax.set_xlim(-110, 135)

    legend = ax.legend(loc="upper right", bbox_to_anchor=(1.27, 1.0), fontsize=13)
    for text in legend.get_texts():
        text.set_color(text_color)

    fig.text(
        0.5, 0.06,
        "Right = stronger | Left = opponent stronger | ↓ = lower is better",
        ha="center",
        color=text_color,
        fontsize=14
    )

    plt.subplots_adjust(left=0.22, right=0.82, top=0.88, bottom=0.16)
    plt.savefig(save_path, facecolor="black", bbox_inches="tight")
    plt.close()


def create_radar_plot(stats_a: dict, stats_b: dict, save_path: Path, title: str, team_a: str = "Bayern Munich", team_b: str = "Real Madrid"):
    plt.style.use("dark_background")

    labels = ["Goals/Game", "Shots/90", "Shots on Target/90", "Possession", "Save Rate"]

    raw_a = [
        stats_a["goals_per_game"],
        stats_a["shots_per_90"],
        stats_a["sot_per_90"],
        stats_a["possession"],
        stats_a["save_pct"],
    ]
    raw_b = [
        stats_b["goals_per_game"],
        stats_b["shots_per_90"],
        stats_b["sot_per_90"],
        stats_b["possession"],
        stats_b["save_pct"],
    ]

    max_vals = [max(a, b) if max(a, b) != 0 else 1 for a, b in zip(raw_a, raw_b)]
    norm_a = [a / m for a, m in zip(raw_a, max_vals)]
    norm_b = [b / m for b, m in zip(raw_b, max_vals)]

    angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
    angles += angles[:1]
    norm_a += norm_a[:1]
    norm_b += norm_b[:1]

    fig = plt.figure(figsize=(10, 8))
    fig.patch.set_facecolor("black")

    ax = fig.add_axes([0.12, 0.10, 0.72, 0.80], polar=True)
    ax.set_facecolor("black")

    color_a = "#d00027"
    color_b = "#f2f2f2"
    text_color = "#66c2ff"

    ax.plot(angles, norm_a, color=color_a, linewidth=2.2, label=team_a)
    ax.fill(angles, norm_a, color=color_a, alpha=0.2)
    ax.plot(angles, norm_b, color=color_b, linewidth=2.2, label=team_b)
    ax.fill(angles, norm_b, color=color_b, alpha=0.2)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels([])

    custom_r = [1.12, 1.12, 1.20, 1.13, 1.10]
    custom_angle_offsets = [0.16, -0.08, 0.14, -0.16, 0.00]

    for angle, label, r, offset in zip(angles[:-1], labels, custom_r, custom_angle_offsets):
        ax.text(angle + offset, r, label, color=text_color, fontsize=15, ha="center", va="center")

    ax.set_yticks([0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(["25%", "50%", "75%", "100%"], color=text_color, fontsize=12)
    ax.set_rlabel_position(200)
    ax.tick_params(colors=text_color)

    plt.title(title, color=text_color, pad=28, fontsize=18)

    legend = plt.legend(loc="upper right", bbox_to_anchor=(1.30, 1.10), fontsize=13)
    for text in legend.get_texts():
        text.set_color(text_color)

    fig.text(
        0.5, 0.04,
        "Normalized values (1.0 = best team per metric)",
        ha="center",
        color=text_color,
        fontsize=14
    )

    plt.savefig(save_path, facecolor="black", bbox_inches="tight")
    plt.close()


# =========================
# ANALYSE
# =========================

def run_analysis(
    label: str,
    team_a_standard_path: Path,
    team_b_standard_path: Path,
    team_a_shooting_path: Path,
    team_b_shooting_path: Path,
    team_a_goalkeeping_path: Path,
    team_b_goalkeeping_path: Path,
    output_prefix: str = "",
    remove_country_prefix: bool = False,
    team_a_key: str = "Bayern Munich",
    team_b_key: str = "Real Madrid",
):
    standard_a_df = load_standard_csv(team_a_standard_path, remove_country_prefix=remove_country_prefix)
    standard_b_df = load_standard_csv(team_b_standard_path, remove_country_prefix=remove_country_prefix)

    shooting_a_df = load_shooting_csv(team_a_shooting_path, remove_country_prefix=remove_country_prefix)
    shooting_b_df = load_shooting_csv(team_b_shooting_path, remove_country_prefix=remove_country_prefix)

    goalkeeping_a_df = load_goalkeeping_csv(team_a_goalkeeping_path, remove_country_prefix=remove_country_prefix)
    goalkeeping_b_df = load_goalkeeping_csv(team_b_goalkeeping_path, remove_country_prefix=remove_country_prefix)

    team_a_standard = find_team_row(standard_a_df, team_a_key, f"{label} Standard Team A")
    team_b_standard = find_team_row(standard_b_df, team_b_key, f"{label} Standard Team B")

    team_a_shooting = find_team_row(shooting_a_df, team_a_key, f"{label} Shooting Team A")
    team_b_shooting = find_team_row(shooting_b_df, team_b_key, f"{label} Shooting Team B")

    team_a_goalkeeping = find_team_row(goalkeeping_a_df, team_a_key, f"{label} Goalkeeping Team A")
    team_b_goalkeeping = find_team_row(goalkeeping_b_df, team_b_key, f"{label} Goalkeeping Team B")

    require_columns(team_a_shooting, ["Sh", "SoT", "G/Sh", "PK", "PKatt", "90s", "Sh/90_berechnet", "SoT/90_berechnet"], f"{label} Shooting Team A")
    require_columns(team_b_shooting, ["Sh", "SoT", "G/Sh", "PK", "PKatt", "90s", "Sh/90_berechnet", "SoT/90_berechnet"], f"{label} Shooting Team B")
    require_columns(team_a_goalkeeping, ["SoTA_per_90", "Save%"], f"{label} Goalkeeping Team A")
    require_columns(team_b_goalkeeping, ["SoTA_per_90", "Save%"], f"{label} Goalkeeping Team B")

    print(f"\n===== {label.upper()} =====")

    print("\nBAYERN:")
    print(team_a_standard[["Squad", "MP", "Poss", "Gls", "Ast"]])

    print("\nREAL:")
    print(team_b_standard[["Squad", "MP", "Poss", "Gls", "Ast"]])

    print("\nSHOOTING VERGLEICH:")
    print(pd.concat([
        team_a_shooting[SHOOTING_OUTPUT_COLS].assign(Team="Bayern Munich"),
        team_b_shooting[SHOOTING_OUTPUT_COLS].assign(Team="Real Madrid"),
    ], ignore_index=True))

    print("\nBAYERN GOALKEEPING TEAM:")
    print(team_a_goalkeeping)

    print("\nREAL GOALKEEPING TEAM:")
    print(team_b_goalkeeping)

    team_a_stats = build_stats_dict(
        team_a_standard.iloc[0],
        team_a_shooting.iloc[0],
        team_a_goalkeeping.iloc[0]
    )
    team_b_stats = build_stats_dict(
        team_b_standard.iloc[0],
        team_b_shooting.iloc[0],
        team_b_goalkeeping.iloc[0]
    )

    print_match_summary(label, team_a_stats, team_b_stats)

    create_basic_bar_plot(
        team_a_standard,
        team_b_standard,
        DATA_DIR / f"{output_prefix}vergleich_plot.png",
        f"Bayern vs Real Madrid – {label}"
    )
    print(f"Plot gespeichert unter: data/{output_prefix}vergleich_plot.png")

    create_extended_bar_plot(
        team_a_stats,
        team_b_stats,
        DATA_DIR / f"{output_prefix}vergleich_erweitert_plot.png",
        title=f"Bayern vs Real Madrid – {label} Shooting & Goalkeeping"
    )
    print(f"Plot gespeichert unter: data/{output_prefix}vergleich_erweitert_plot.png")

    create_scout_plot(
        team_a_stats,
        team_b_stats,
        DATA_DIR / f"{output_prefix}scout_style_dark.png",
        f"Bayern vs Real Madrid – {label} Performance Comparison"
    )
    print(f"Scout Plot gespeichert unter: data/{output_prefix}scout_style_dark.png")

    create_radar_plot(
        team_a_stats,
        team_b_stats,
        DATA_DIR / f"{output_prefix}radar_dark.png",
        f"{label} Team Profile Comparison"
    )
    print(f"Radar Plot gespeichert unter: data/{output_prefix}radar_dark.png")


# =========================
# MAIN
# =========================

def main():
    run_analysis(
        label="Liga",
        team_a_standard_path=DATA_DIR / "bundesliga_standard.csv",
        team_b_standard_path=DATA_DIR / "laliga_standard.csv",
        team_a_shooting_path=DATA_DIR / "bundesliga_shooting.csv",
        team_b_shooting_path=DATA_DIR / "laliga_shooting.csv",
        team_a_goalkeeping_path=DATA_DIR / "bundesliga_goalkeeping.csv",
        team_b_goalkeeping_path=DATA_DIR / "laliga_goalkeeping.csv",
        output_prefix="",
        remove_country_prefix=False,
    )

    run_analysis(
        label="Champions League",
        team_a_standard_path=DATA_DIR / "cl_standard.csv",
        team_b_standard_path=DATA_DIR / "cl_standard.csv",
        team_a_shooting_path=DATA_DIR / "cl_shooting.csv",
        team_b_shooting_path=DATA_DIR / "cl_shooting.csv",
        team_a_goalkeeping_path=DATA_DIR / "cl_goalkeeping.csv",
        team_b_goalkeeping_path=DATA_DIR / "cl_goalkeeping.csv",
        output_prefix="cl_",
        remove_country_prefix=True,
    )


if __name__ == "__main__":
    main()