import Head from 'next/head';

import { AtmosphericField } from '@/components/atmospheric-field';
import { ConsoleNote } from '@/components/console-note';
import { Soundscape } from '@/components/soundscape';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Luke Maloney</title>
        <meta name="description" content="Luke Maloney — software engineer." />
        <meta name="theme-color" content="#c7c8c1" />
      </Head>

      <main className="scene">
        <AtmosphericField />
        <Soundscape />
        <ConsoleNote />

        <h1 className="sr-only">Luke Maloney</h1>

        <a
          href="https://x.com/lukedotxyz"
          target="_blank"
          rel="noreferrer"
          className="scene-signature"
          aria-label="Luke Maloney on X"
        >
          @lukedotxyz
        </a>
      </main>
    </>
  );
}
