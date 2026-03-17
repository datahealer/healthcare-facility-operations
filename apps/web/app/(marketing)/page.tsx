import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon, CalendarCheck } from 'lucide-react';

import { PricingTable } from '@kit/billing-gateway/marketing';
import {
  CtaButton,
  EcosystemShowcase,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
  PillActionButton,
  SecondaryHero,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import billingConfig from '~/config/billing.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:homeTitle'),
    description: t('marketing:homeDescription'),
  };
};

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      <div className={'mx-auto'}>
        <Hero
          pill={
            <Pill label={'Live'}>
              <span>
                Built for healthcare professionals who refuse to settle
              </span>
              <PillActionButton asChild>
                <Link href={pathsConfig.auth.signUp}>
                  <ArrowRightIcon className={'h-4 w-4'} />
                </Link>
              </PillActionButton>
            </Pill>
          }
          title={
            <span className="text-secondary-foreground">
              <span>Your practice is stuck in 2005. We fix that.</span>
            </span>
          }
          subtitle={
            <span>
              Doctors, radiologists, pathologists, dentists, physiotherapists
              &mdash; you spent a decade mastering medicine. Why are you still
              managing bookings on WhatsApp? This platform eliminates no-shows,
              automates follow-ups, and turns your calendar into a revenue
              engine. First principles. Zero nonsense.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={
            <Image
              priority
              className={
                'dark:border-primary/10 w-full rounded-lg border border-gray-200'
              }
              width={3558}
              height={2222}
              src="/images/dashboard.webp"
              alt={`Healthcare operations dashboard`}
            />
          }
        />
      </div>

      <div className={'container mx-auto'}>
        <div className={'py-4 xl:py-8'}>
          <FeatureShowcase
            heading={
              <>
                <b className="dark:text-foreground font-medium tracking-tight">
                  The operating system for modern healthcare
                </b>
                .{' '}
                <span className="text-secondary-foreground/70 block font-normal tracking-tight">
                  We didn&apos;t build another appointment app. We built the
                  infrastructure that makes your practice run like a machine.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <CalendarCheck className="h-4 w-4" />
                <span>Complete practice command center</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={'relative col-span-1 overflow-hidden'}
                label={'Smart Scheduling'}
                description={`AI-optimized appointment slots that pack your calendar without burning out your staff. Every empty slot is lost revenue. We don't allow that.`}
              ></FeatureCard>

              <FeatureCard
                className={'relative col-span-1 w-full overflow-hidden'}
                label={'No-Show Killer'}
                description={`Automated reminders via SMS, WhatsApp, and email. Patients who ghost get waitlisted. Your chair stays warm. Average 40% reduction in no-shows.`}
              ></FeatureCard>

              <FeatureCard
                className={'relative col-span-1 overflow-hidden'}
                label={'Follow-Up Autopilot'}
                description={`Stop chasing patients manually. Automated follow-up sequences ensure continuity of care and keep your revenue pipeline flowing.`}
              />

              <FeatureCard
                className={'relative col-span-1 overflow-hidden'}
                label={'Multi-Location Hub'}
                description={`Run one clinic or twenty. Manage doctors, technicians, and equipment across every location from a single dashboard. Scale without chaos.`}
              />

              <FeatureCard
                className={'relative col-span-1 overflow-hidden'}
                label={'Revenue Analytics'}
                description={`Real-time dashboards showing bookings, cancellations, revenue per provider, and utilization rates. What gets measured gets multiplied.`}
              />

              <FeatureCard
                className={'relative col-span-1 overflow-hidden'}
                label={'Patient Portal'}
                description={`Patients book, reschedule, and manage their own appointments. Less phone calls for your staff. Better experience for everyone. Win-win.`}
              />
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>

      <div className={'container mx-auto'}>
        <EcosystemShowcase
          heading="Healthcare runs on trust. Your scheduling should too."
          description="From solo dental clinics to multi-chain diagnostic labs, thousands of healthcare professionals use our platform to reclaim their time and multiply their revenue. The best part? You can be live in under 10 minutes."
        >
          <Image
            className="rounded-md"
            src={'/images/sign-in.webp'}
            alt="Healthcare professional portal"
            width={1000}
            height={1000}
          />
        </EcosystemShowcase>
      </div>

      <div className={'container mx-auto'}>
        <div
          className={
            'flex flex-col items-center justify-center space-y-12 py-4 xl:py-8'
          }
        >
          <SecondaryHero
            pill={<Pill label="Start for free">No credit card required.</Pill>}
            heading="Pricing that makes sense for every practice size"
            subheading="Start free. Upgrade when you're printing money. We only win when you win."
          />

          <div className={'w-full'}>
            <PricingTable
              config={billingConfig}
              paths={{
                signUp: pathsConfig.auth.signUp,
                return: pathsConfig.app.home,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-2.5'}>
      <CtaButton className="h-10 text-sm">
        <Link href={pathsConfig.auth.signUp}>
          <span className={'flex items-center space-x-0.5'}>
            <span>
              <Trans i18nKey={'common:getStarted'} />
            </span>

            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant={'link'} className="h-10 text-sm">
        <Link href={'/pricing'}>
          <Trans i18nKey={'common:pricing'} />
        </Link>
      </CtaButton>
    </div>
  );
}
