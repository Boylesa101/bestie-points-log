interface SplashScreenProps {
  isFirstLaunch: boolean
  onStart: () => void
}

export const SplashScreen = ({
  isFirstLaunch,
  onStart,
}: SplashScreenProps) => (
  <main className="splash-screen">
    <section className="splash-screen__panel">
      <div className="splash-screen__bubble splash-screen__bubble--one" />
      <div className="splash-screen__bubble splash-screen__bubble--two" />
      <div className="splash-screen__sparkle" aria-hidden="true">
        ✨
      </div>
      <p className="splash-screen__caption">A happy points adventure</p>
      <h1>BESTIE POINTS LOG</h1>
      <p>
        Quick, cheerful point tracking for a parent and a little bestie.
      </p>

      {isFirstLaunch ? (
        <div className="splash-screen__start">
          <button className="save-button save-button--primary" onClick={onStart} type="button">
            START
          </button>
        </div>
      ) : (
        <div className="splash-screen__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </section>
  </main>
)
