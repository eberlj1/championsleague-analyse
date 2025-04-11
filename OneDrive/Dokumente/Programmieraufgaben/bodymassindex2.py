"""Berechnung des Bodymassindex"""
"""Rechnet zum Anfangs berechneten Bodymassindex 5 zusätzliche untekategorien
dazu""" 

h = float(input("Gib die Körpergröße in cm an: "))
m = float(input("Gib die Körpermasse in kg an: "))

h = h / 100  # Umrechnung von cm in Meter
BMI = m / h ** 2

print(f"Dein BMI beträgt {BMI:.2f}")

"""Bodymassindex.2"""
if BMI < 17.50:
    print("Anorektisches Untergewicht festgestellt")
elif 17.50 <= BMI < 18.50:
    print("Untergewicht festgestellt")
elif 18.5 <= BMI < 25.0:
    print("Normalgewicht vorhanden")
elif 25.0 <= BMI < 30.0:
    print("Leichtes Übergewicht festgestellt")
else:
    print("Übergewicht festgestellt")
    