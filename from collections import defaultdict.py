from collections import defaultdict

def first(x):
    if x not in G:
        return {'#'} if x == '#' else {x}
    if x in F:
        return F[x]
    r = set()
    for p in G[x]:
        if p == ['#']:
            r.add('#')
        else:
            for s in p:
                t = first(s)
                r |= t - {'#'}
                if '#' not in t: break
            else: r.add('#')
    F[x] = r
    return r

def first_prod(p):
    r = set()
    for s in p:
        t = first(s)
        r |= t - {'#'}
        if '#' not in t: break
    else: r.add('#')
    return r

def follow():
    R = defaultdict(set)
    R[start].add('$')
    change = True
    while change:
        change = False
        for A in G:
            for p in G[A]:
                for i, B in enumerate(p):
                    if B not in G: continue
                    beta = p[i+1:]
                    old = len(R[B])
                    if beta:
                        t = first_prod(beta)
                        R[B] |= t - {'#'}
                        if '#' in t: R[B] |= R[A]
                    else:
                        R[B] |= R[A]
                    change |= len(R[B]) > old
    return R

def tokenize(s):
    s = s.replace(" ", "").replace("’", "'")
    r, i = [], 0
    while i < len(s):
        if s[i:i+2] == "id":
            r.append("id"); i += 2
        elif i+1 < len(s) and s[i].isupper() and s[i+1] == "'":
            r.append(s[i:i+2]); i += 2
        elif s[i] in "#ε∈":
            r.append("#"); i += 1
        else:
            r.append(s[i]); i += 1
    return r

print("LL(1) PARSING TABLE GENERATOR")
n = int(input("Enter number of productions: "))
G = {}

for _ in range(n):
    rule = input("Enter production: ").replace("’", "'")
    L, R = rule.replace("→", "->").split("->", 1)
    G.setdefault(L.strip(), [])
    for x in R.replace("/", "|").split("|"):
        x = x.strip()
        G[L.strip()].append(['#'] if x in "#ε∈e" else tokenize(x))

start = next(iter(G))
F = {}
for A in G: first(A)
FO = follow()

T = defaultdict(dict)
terms = {'$'}
conflict = False

for A in G:
    for p in G[A]:
        for a in first_prod(p) - {'#'}:
            if a in T[A]: conflict = True
            T[A][a] = p
        if '#' in first_prod(p):
            for a in FO[A]:
                if a in T[A]: conflict = True
                T[A][a] = p
        terms |= first_prod(p) - {'#'}

print("\nGRAMMAR")
for A in G:
    for p in G[A]: print(f"{A} → {' '.join(p).replace('#','∈')}")

print("\nFIRST SET")
for A in G: print(f"FIRST({A}) = {{ {', '.join(sorted(F[A])).replace('#','∈')} }}")

print("\nFOLLOW SET")
for A in G: print(f"FOLLOW({A}) = {{ {', '.join(sorted(FO[A]))} }}")

terms = sorted(terms)
print("\nLL(1) PARSING TABLE")
print("NT/T".ljust(10) + "".join(x.center(15) for x in terms))
print("-" * (10 + 15 * len(terms)))

for A in G:
    row = A.ljust(10)
    for a in terms:
        p = T[A].get(a)
        row += (f"{A}→{' '.join(p).replace('#','∈')}" if p else "-").center(15)
    print(row)

print("\nRESULT")
print("Grammar is NOT LL(1)." if conflict else "Grammar is LL(1).")