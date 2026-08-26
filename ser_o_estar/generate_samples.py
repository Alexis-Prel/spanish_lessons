import argparse
import csv
import json

import spacy
import attrs
from tqdm import tqdm

@attrs.define
class Sample:
    sentence: str
    tokens: tuple[str]
    lemmas: tuple[str]

    def blanked (self) -> list[str]:
        return  [
            "_____" if lemma in {"ser", "estar"} else token
            for token, lemma in zip(self.tokens, self.lemmas)
        ]

    def to_dict(self) -> dict:
        return {
            "sentence": self.sentence,
            "tokens": list(self.tokens),
            "lemmas": list(self.lemmas),
            "blanked": self.blanked()
        }

def main(max_samples: int = 1_000, outfile: str = "ser_o_estar/samples.json"):
    nlp = spacy.load("es_core_news_sm")

    selected: list[Sample] = []
    with open('data/tatoeba/spa_sentences.tsv', 'r', encoding='utf-8', newline='') as f:
        reader = csv.reader(f, delimiter='\t')
        for _, _, sentence in tqdm(reader):
            tokens = tuple(token for token in nlp(sentence))
            lemmas = tuple(token.lemma_ for token in tokens)
            tokens = tuple(token.text for token in tokens)
            if {"ser", "estar"}.intersection(lemmas):
                selected.append(
                    Sample(sentence, tokens, lemmas)
                )
            if len(selected) >= max_samples: 
                break
    
    with open(outfile, mode="w") as f:
        json.dump([sample.to_dict() for sample in selected], f, indent=4)
    print(f"Exported {len(selected)} samples to {outfile}.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max_samples", type=int, default=1_000)
    parser.add_argument("--outfile", type=str, default="ser_o_estar/samples.json")
    args = parser.parse_args()
    main(max_samples=args.max_samples, outfile=args.outfile)






