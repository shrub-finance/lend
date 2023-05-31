/* tslint:disable:no-empty */
import Link from 'next/link';
import Text from '../Text';
import { cn } from '../../utils';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';

type NavElementProps = {
    label: string;
    href: string;
    as?: string;
    scroll?: boolean;
    chipLabel?: string;
    disabled?: boolean;
    navigationStarts?: () => void;
};

const NavElement = ({
    label,
    href,
    as,
    scroll,
    disabled,
  chipLabel,
    navigationStarts = () => {},
}: NavElementProps) => {
    const router = useRouter();
    const isActive = href === router.asPath || (as && as === router.asPath);
    const divRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (divRef.current) {
            if (chipLabel!=="isLogo") {
                divRef.current.className = cn(
                  'transition-all duration-300 ease-out ',
                  isActive
                    ? 'bg-shrub-grey text-shrub-green-50 rounded-btn font-semibold'
                    : 'group-hover:bg-gray-800 rounded-btn group-hover:text-shrub-green-50',
                );
            }

        }
    }, [isActive]);

    return (
        <Link
            href={href}
            as={as}
            scroll={scroll}
            // @ts-ignore
            chipLabel={chipLabel}
            passHref
            className={cn(
                'group flex h-full flex-col items-center justify-between bg-gra',
                disabled &&
                    'pointer-events-none cursor-not-allowed opacity-50'
            )}
            onClick={() => navigationStarts()}
        >
            <div className="flex flex-row items-center gap-3" ref={divRef} >
                {chipLabel!=="isLogo"? <Text className="text-base font-medium btn-sm px-5 py-1"> {label} </Text>: <div className="mr-12 pl-14"> {label} </div>}
            </div>
        </Link>
    );
};

export default NavElement;

