import next, { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Prismic from '@prismicio/client';
import { getPrismicClient } from '../services/prismic';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { useState } from 'react';


interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps) {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleLoadPosts() {
    const response = await fetch(nextPage)
    const response_data = await response.json();

    const data = response_data.results.map((post: Post) => {
      return {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        }
      }
    })

    setNextPage(response_data.next_page);
    setPosts([
      ...posts,
      ...data
    ])
  }

  return (
    <>
    <Head>
      <title>Posts</title>
    </Head>
      <main className={commonStyles.container}>
        <div className={styles.logo}>
          <img src="/logo.svg" alt="logo" />
        </div>
        <section className={styles.posts}>
          { posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a className={styles.posts}>
                <h1>{ post.data.title }</h1>
                <h3>{ post.data.subtitle }</h3>
                <div>
                  <FiCalendar className={styles.calendarIcon} />
                  <time>
                    { format(
                      new Date(post.first_publication_date),
                      "dd MMM yyyy",
                      {
                        locale: ptBR,
                      }
                    )}
                  </time>
                  <FiUser className={styles.userIcon} />
                  <span>{ post.data.author }</span>
                </div>
              </a>
            </Link>
          ))}
          {nextPage ? 
            <button onClick={handleLoadPosts}>
              Carregar mais posts
            </button> : ''
          }
        </section>
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'posts')
  ], {
    fetch: ['posts.title', 'posts.subtitle', 'posts.author', 'posts.content'],
    orderings : '[document.first_publication_date desc]',
    pageSize: 2,
  });

  const next_page = postsResponse.next_page;
  const results = postsResponse.results.map((post: Post) => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      }
    }
  })

  return {
    props: {
      postsPagination: {
        next_page: next_page,
        results: results
      }
    },
    revalidate: 60 * 30, //30 minutes
  }
};
