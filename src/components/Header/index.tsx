import styles from './header.module.scss'
import Link from 'next/link'
import commonStyles from '../../styles/common.module.scss';

export default function Header() {
  return (
    <header className={commonStyles.container}>
      <Link href={'/'}>
        <a>
          <div className={styles.header}>
            <img src="/logo.svg" alt="logo" />
          </div>
        </a>
      </Link>
    </header>
  )
}
