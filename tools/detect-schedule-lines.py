import glob

import numpy as np
from PIL import Image


def groups(values):
    result = []
    for value in values:
        if not result or value > result[-1][-1] + 1:
            result.append([value])
        else:
            result[-1].append(value)
    return [round(sum(group) / len(group)) for group in result]


for image_path in sorted(glob.glob("tmp/pdfs/waic-forums-*.png")):
    image = np.asarray(Image.open(image_path).convert("L"))
    crop = image[:, 420:1080]
    counts = (crop < 245).sum(axis=1)
    candidates = np.where(counts > 500)[0].tolist()
    vertical_counts = (image < 205).sum(axis=0)
    vertical_candidates = np.where(vertical_counts > 1200)[0].tolist()
    print(image_path, "rows", groups(candidates), "cols", groups(vertical_candidates))
