import React from 'react';
import { useTranslation } from 'react-i18next';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import IntroOverlay, { IntroPoint } from './IntroOverlay';

/**
 * Drop-in onboarding for a tab screen: shows the intro for `id` the first time
 * the user opens it. Content comes from i18n at `intro.<id>.*`.
 *
 *   <ScreenIntro id="home" />
 */
export default function ScreenIntro({ id }: { id: string }) {
  const { t } = useTranslation();
  const intro = useScreenIntro(id);
  return (
    <IntroOverlay
      visible={intro.visible}
      onClose={intro.dismiss}
      title={t(`intro.${id}.title`)}
      subtitle={t(`intro.${id}.subtitle`)}
      points={t(`intro.${id}.points`, { returnObjects: true }) as unknown as IntroPoint[]}
      cta={t('intro.gotIt')}
    />
  );
}
