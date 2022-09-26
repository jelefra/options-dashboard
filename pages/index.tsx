import dayjs from 'dayjs';

import Container from '../components/Container';
import UpcomingEarnings from '../components/UpcomingEarnings';

import data from '../data/upcomingEarnings';

const NOW = dayjs();

const Home = () => {
  return (
    <Container>
      <UpcomingEarnings data={data} now={NOW} />
    </Container>
  );
};

export default Home;
