# Champions League Analysis

A compact football analytics project for comparing team performance across domestic league and UEFA Champions League data.

This repository contains a Python-based comparison workflow that evaluates Bayern Munich and Real Madrid using selected team-level metrics from standard stats, shooting stats, and goalkeeping stats. The project generates console-based summaries as well as multiple visual outputs, including bar charts, a scout-style comparison chart, and a radar chart.

## Project Purpose

The goal of this project is to build a clean and understandable analytical prototype that demonstrates how team performance can be compared across competitions using publicly available statistical data.

The current version is intentionally designed as a **simplified analytical model**. It provides a structured first comparison, but it is **not a full predictive system** and should not be interpreted as a complete match forecasting engine.

## What the Project Does

The script currently:

- loads team data from CSV files
- compares Bayern Munich and Real Madrid in league data
- compares Bayern Munich and Real Madrid in Champions League data
- calculates selected offensive and defensive indicators
- creates multiple visualizations for easier interpretation
- prints a compact analytical summary and a simple score-based match tendency

## Metrics Included

The current analysis uses selected team-level indicators such as:

- goals per game
- shots per 90 minutes
- shots on target per 90 minutes
- shooting efficiency
- possession
- shots on target conceded per 90 minutes
- save percentage

These metrics are used to build a rough comparative profile of both teams.

## Visual Outputs

The project generates the following outputs:

- `vergleich_plot.png`
- `vergleich_erweitert_plot.png`
- `scout_style_dark.png`
- `radar_dark.png`
- `cl_vergleich_plot.png`
- `cl_vergleich_erweitert_plot.png`
- `cl_scout_style_dark.png`
- `cl_radar_dark.png`

## Important Limitation

This project is a **rough algorithmic prototype** and not a professional-grade forecasting model.

A number of important football-specific and match-specific factors are **not yet included**, for example:

- player injuries and suspensions
- current form over recent matches
- home vs. away effects
- strength of schedule / opponent quality
- tactical matchups
- squad rotation
- expected goals models
- pressing intensity
- transition behaviour
- set-piece strength
- match context and competition stage
- sample size differences
- uncertainty estimation

Because of these limitations, the output should be understood as an **illustrative analytical comparison**, not as a reliable prediction of a real match outcome.

## Methodological Positioning

From a data analysis perspective, this repository should be seen as:

- an exploratory football analytics prototype
- a structured metric-comparison tool
- a foundation for more advanced modelling

It is useful for demonstrating basic data handling, metric engineering, and visualization logic in a football analytics context.

## Repository Structure

```text
championsleague-analyse/
│
├── main.py
├── data/
│   ├── bundesliga_standard.csv
│   ├── bundesliga_shooting.csv
│   ├── bundesliga_goalkeeping.csv
│   ├── laliga_standard.csv
│   ├── laliga_shooting.csv
│   ├── laliga_goalkeeping.csv
│   ├── cl_standard.csv
│   ├── cl_shooting.csv
│   ├── cl_goalkeeping.csv
│   ├── vergleich_plot.png
│   ├── vergleich_erweitert_plot.png
│   ├── scout_style_dark.png
│   ├── radar_dark.png
│   ├── cl_vergleich_plot.png
│   ├── cl_vergleich_erweitert_plot.png
│   ├── cl_scout_style_dark.png
│   └── cl_radar_dark.png