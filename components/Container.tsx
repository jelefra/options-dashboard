import React, { ReactNode } from 'react';

import styles from '../styles/Container.module.css';

const Container = ({ children }: { children: ReactNode }) => (
  <div className={styles.container}>{children}</div>
);

export default Container;
