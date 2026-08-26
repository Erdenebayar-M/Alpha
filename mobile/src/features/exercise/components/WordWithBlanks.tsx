import { Fragment, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { fonts } from '@/src/theme/typography';

interface WordWithBlanksProps {
  /** The word with "_" marking each missing letter, e.g. "Сург__л_". */
  text: string;
  /** One entry per "_" in `text`: the placed letter, or null while still empty. */
  filled: (string | null)[];
}

/**
 * The target word of a fill-the-letters task, drawn inline: the letters the child
 * already has render as plain text, and every "_" renders as either the letter that
 * was dropped into it or an empty white slot card (Figma "Үг нөхөх"). Filled blanks
 * deliberately lose the card chrome so a completed word reads as one clean word.
 */
export default function WordWithBlanks({ text, filled }: WordWithBlanksProps) {
  // Split on the "_" blank marker (AGENTS §5): "Сург__л_" -> runs ["Сург","","л",""]
  // with a blank between each consecutive pair.
  const runs = useMemo(() => text.split('_'), [text]);

  return (
    <View style={styles.word}>
      {runs.map((run, index) => {
        const letter = index > 0 ? (filled[index - 1] ?? null) : null;
        return (
          <Fragment key={index}>
            {index > 0 ? (
              letter !== null ? (
                <Text style={styles.wordText}>{letter}</Text>
              ) : (
                <View style={styles.slot} />
              )
            ) : null}
            {run.length > 0 ? <Text style={styles.wordText}>{run}</Text> : null}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  word: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  wordText: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.textChoice,
    letterSpacing: -0.064,
  },
  slot: {
    width: 26,
    height: 38,
    marginHorizontal: 3,
    borderRadius: 4,
    backgroundColor: colors.white,
    borderBottomWidth: 3,
    borderBottomColor: '#DDE6F3',
    shadowColor: '#283C64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
});
